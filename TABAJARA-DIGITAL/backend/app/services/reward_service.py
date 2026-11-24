"""Recompensas do Clube e presente de aniversário.

Tudo que vale pontos ou é grátis é validado aqui, no servidor:
- custo em pontos vem do banco (nunca do navegador);
- o débito de pontos é atômico (saldo >= custo) e fica no extrato ligado ao pedido;
- estoque é reservado com atualização condicional;
- o presente de aniversário tem índice único (cliente + ano): um por ano, mesmo com cliques repetidos;
- se o pedido for cancelado, pontos, estoque e presente voltam.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.core.config import settings as app_settings
from app.models import BirthdayGift, Customer, Order, Product, Reward
from app.models.base import utc_now
from app.models.loyalty import LoyaltySettings
from app.models.order import ItemKind, OrderItem
from app.schemas.club import BirthdayOut, BirthdayProductOut, RewardAdminOut, RewardOut
from app.services import loyalty_service


def _now_local() -> datetime:
    return datetime.now(ZoneInfo(app_settings.timezone))


def _oid(value: str, message: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(status_code=422, detail=message) from None


# ---------------------------------------------------------------------------
# Catálogo
# ---------------------------------------------------------------------------


async def _products_for(rewards: list[Reward]) -> dict[PydanticObjectId, Product]:
    ids = [r.product_id for r in rewards if r.product_id]
    if not ids:
        return {}
    return {p.id: p for p in await Product.find({"_id": {"$in": ids}}).to_list()}


def _image(reward: Reward, products: dict) -> str | None:
    if reward.image_url:
        return reward.image_url
    product = products.get(reward.product_id) if reward.product_id else None
    return product.image_url if product else None


def reward_out(reward: Reward, products: dict) -> RewardOut:
    return RewardOut(
        id=str(reward.id),
        name=reward.name,
        description=reward.description,
        points_cost=reward.points_cost,
        image_url=_image(reward, products),
        product_id=str(reward.product_id) if reward.product_id else None,
        available=reward.active and (reward.stock is None or reward.stock > 0),
    )


def reward_admin_out(reward: Reward, products: dict) -> RewardAdminOut:
    return RewardAdminOut(
        **reward_out(reward, products).model_dump(),
        active=reward.active,
        stock=reward.stock,
        position=reward.position,
        redeemed_count=reward.redeemed_count,
    )


async def public_catalog() -> list[RewardOut]:
    rewards = await Reward.find({"active": True}).sort([("position", 1), ("points_cost", 1)]).to_list()
    products = await _products_for(rewards)
    return [reward_out(r, products) for r in rewards]


# ---------------------------------------------------------------------------
# Aniversário
# ---------------------------------------------------------------------------


async def birthday_status(customer: Customer, settings: LoyaltySettings | None = None) -> BirthdayOut:
    settings = settings or await loyalty_service.get_settings()
    product = await Product.get(settings.birthday_product_id) if settings.birthday_product_id else None
    enabled = settings.enabled and settings.birthday_enabled and product is not None
    out = BirthdayOut(
        enabled=enabled,
        has_date=customer.birth_month is not None,
        day=customer.birth_day,
        month=customer.birth_month,
        product=BirthdayProductOut(id=str(product.id), name=product.name, image_url=product.image_url)
        if product
        else None,
    )
    if not enabled or customer.birth_month is None:
        return out
    now = _now_local()
    out.used_this_year = await BirthdayGift.find_one({"customer_id": customer.id, "year": now.year}) is not None
    if customer.birthday_set_at:
        release = customer.birthday_set_at + timedelta(days=settings.birthday_min_days)
        if release > utc_now():
            out.available_from = release
    out.eligible = (
        now.month == customer.birth_month
        and not out.used_this_year
        and out.available_from is None
        and bool(product and product.available)
    )
    return out


# ---------------------------------------------------------------------------
# Pedido com resgates / presente
# ---------------------------------------------------------------------------


async def build_items(
    customer: Customer, rewards_in: list, birthday_gift: bool
) -> tuple[list[OrderItem], int, list[tuple[Reward, int]], bool]:
    """Valida e monta os itens de resgate/presente. Ainda não debita nada."""
    quantities: dict[PydanticObjectId, int] = {}
    for item in rewards_in:
        rid = _oid(item.reward_id, "Recompensa inválida. Atualize a página.")
        quantities[rid] = min(5, quantities.get(rid, 0) + item.quantity)

    rewards = await Reward.find({"_id": {"$in": list(quantities)}}).to_list() if quantities else []
    by_id = {r.id: r for r in rewards}
    if len(by_id) != len(quantities) or any(not r.active for r in rewards):
        raise HTTPException(status_code=409, detail="Uma recompensa não está mais disponível. Atualize a página.")
    products = await _products_for(rewards)

    items: list[OrderItem] = []
    reserved: list[tuple[Reward, int]] = []
    points = 0
    for rid, qty in quantities.items():
        reward = by_id[rid]
        if reward.stock is not None and reward.stock < qty:
            raise HTTPException(status_code=409, detail=f"Acabou o estoque de “{reward.name}”.")
        product = products.get(reward.product_id) if reward.product_id else None
        if product is not None and not product.available:
            raise HTTPException(status_code=409, detail=f"“{reward.name}” está indisponível no momento.")
        points += reward.points_cost * qty
        reserved.append((reward, qty))
        items.append(
            OrderItem(
                product_id=reward.product_id,
                name=reward.name,
                unit_price_cents=0,
                quantity=qty,
                kind=ItemKind.REWARD,
                points_cost=reward.points_cost,
                reward_id=reward.id,
            )
        )

    gift = False
    if birthday_gift:
        status_ = await birthday_status(customer)
        if not status_.eligible or status_.product is None:
            raise HTTPException(status_code=409, detail="O presente de aniversário não está disponível agora.")
        items.append(
            OrderItem(
                product_id=PydanticObjectId(status_.product.id),
                name=f"{status_.product.name} (presente de aniversário)",
                unit_price_cents=0,
                quantity=1,
                kind=ItemKind.BIRTHDAY,
            )
        )
        gift = True
    return items, points, reserved, gift


async def reserve(
    customer: Customer, order_id: PydanticObjectId, code: str, points: int, reserved: list, gift: bool
) -> None:
    """Debita pontos, reserva estoque e marca o presente. Desfaz tudo se algo falhar."""
    done_stock: list[tuple[Reward, int]] = []
    spent = False
    gift_marked = False
    try:
        if points > 0:
            await loyalty_service.spend_for_order(customer.id, points, order_id, code)
            spent = True
        for reward, qty in reserved:
            if reward.stock is not None:
                result = await Reward.find_one({"_id": reward.id, "stock": {"$gte": qty}}).update(
                    {"$inc": {"stock": -qty}}
                )
                if not getattr(result, "modified_count", 1):
                    raise HTTPException(status_code=409, detail=f"Acabou o estoque de “{reward.name}”.")
                done_stock.append((reward, qty))
        if gift:
            try:
                await BirthdayGift(customer_id=customer.id, year=_now_local().year, order_id=order_id).insert()
                gift_marked = True
            except DuplicateKeyError:
                raise HTTPException(
                    status_code=409, detail="O presente de aniversário deste ano já foi usado."
                ) from None
    except Exception:
        if spent:
            await loyalty_service.refund_redemption(customer.id, points, order_id, code)
        for reward, qty in done_stock:
            await Reward.find_one({"_id": reward.id}).update({"$inc": {"stock": qty}})
        if gift_marked:
            await BirthdayGift.find({"order_id": order_id}).delete()
        raise


async def confirm(reserved: list) -> None:
    for reward, qty in reserved:
        await Reward.find_one({"_id": reward.id}).update({"$inc": {"redeemed_count": qty}})


async def release_order(order: Order) -> None:
    """Pedido cancelado: devolve pontos dos resgates, estoque e o presente de aniversário."""
    if order.customer_id is None or order.redemption_refunded:
        return
    if order.points_spent > 0:
        await loyalty_service.refund_redemption(order.customer_id, order.points_spent, order.id, order.code)
    for item in order.items:
        if item.kind == ItemKind.REWARD and item.reward_id:
            reward = await Reward.get(item.reward_id)
            if reward:
                inc = {"redeemed_count": -item.quantity}
                if reward.stock is not None:
                    inc["stock"] = item.quantity
                await Reward.find_one({"_id": reward.id}).update({"$inc": inc})
    if order.birthday_gift:
        await BirthdayGift.find({"order_id": order.id}).delete()
    order.redemption_refunded = True
    await order.save()
