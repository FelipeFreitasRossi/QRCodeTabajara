"""Regras de pontos do Clube Tabajara.

Segurança dos pontos:
- o valor de pontos é SEMPRE calculado aqui, nunca recebido do navegador;
- cada movimentação é gravada no extrato antes de mexer no saldo, e um índice
  único (tipo + pedido) impede creditar ou estornar o mesmo pedido duas vezes;
- débitos usam atualização condicional (saldo >= valor), então o saldo nunca fica negativo
  por concorrência.
"""

import math

from beanie import PydanticObjectId, UpdateResponse
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.models import LoyaltyAccount, LoyaltySettings, LoyaltyTransaction, Order, OrderStatus, Product, TransactionType
from app.models.order import ACTIVE_STATUSES


async def get_settings() -> LoyaltySettings:
    current = await LoyaltySettings.find_one({})
    if current is None:
        current = LoyaltySettings()
        await current.insert()
    return current


def points_for(eligible_cents: int, settings: LoyaltySettings) -> int:
    """Pontos de uma compra: R$ elegíveis × pontos por real, arredondado para baixo."""
    if not settings.enabled or eligible_cents <= 0 or eligible_cents < settings.min_order_cents:
        return 0
    return math.floor(eligible_cents / 100 * settings.points_per_real + 1e-9)


async def estimate_points(quantities: dict[str, int]) -> int:
    """Pontos que um conjunto de itens vale, com preços e categorias do banco."""
    settings = await get_settings()
    if not settings.enabled or not quantities:
        return 0
    try:
        ids = [PydanticObjectId(pid) for pid in quantities]
    except Exception:
        return 0
    excluded = set(settings.excluded_category_ids)
    eligible = 0
    for product in await Product.find({"_id": {"$in": ids}}).to_list():
        if product.available and product.category_id not in excluded:
            eligible += product.price_cents * min(quantities.get(str(product.id), 0), 20)
    return points_for(eligible, settings)


async def get_account(customer_id: PydanticObjectId) -> LoyaltyAccount:
    account = await LoyaltyAccount.find_one({"customer_id": customer_id})
    if account:
        return account
    try:
        account = LoyaltyAccount(customer_id=customer_id)
        await account.insert()
        return account
    except DuplicateKeyError:  # criada ao mesmo tempo por outra requisição
        found = await LoyaltyAccount.find_one({"customer_id": customer_id})
        assert found is not None
        return found


async def _apply(
    customer_id: PydanticObjectId, points: int, *, allow_negative: bool, earned: bool = True
) -> LoyaltyAccount | None:
    """Soma `points` ao saldo. Débito sem allow_negative só acontece se houver saldo (atômico).

    earned=False para movimentos que não são ganho (resgate e devolução de resgate).
    """
    await get_account(customer_id)
    query: dict = {"customer_id": customer_id}
    if points < 0 and not allow_negative:
        query["balance"] = {"$gte": -points}
    inc = {"balance": points}
    if points > 0 and earned:
        inc["lifetime_earned"] = points
    if not earned:
        inc["lifetime_spent"] = -points
    return await LoyaltyAccount.find_one(query).update({"$inc": inc}, response_type=UpdateResponse.NEW_DOCUMENT)


async def credit_order(order: Order) -> bool:
    """Credita os pontos de um pedido entregue. Seguro para chamar mais de uma vez."""
    if order.customer_id is None or order.loyalty_credited or order.loyalty_points <= 0:
        return False
    tx = LoyaltyTransaction(
        customer_id=order.customer_id,
        type=TransactionType.EARN,
        points=order.loyalty_points,
        reason=f"Pedido #{order.short_code} entregue",
        order_id=order.id,
        order_code=order.short_code,
    )
    try:
        await tx.insert()
    except DuplicateKeyError:
        order.loyalty_credited = True  # já creditado antes
        await order.save()
        return False
    account = await _apply(order.customer_id, order.loyalty_points, allow_negative=True)
    tx.balance_after = account.balance if account else None
    await tx.save()
    order.loyalty_credited = True
    await order.save()
    return True


async def reverse_order(order: Order) -> bool:
    """Estorna os pontos de um pedido que foi creditado e depois cancelado."""
    if order.customer_id is None or not order.loyalty_credited:
        return False
    tx = LoyaltyTransaction(
        customer_id=order.customer_id,
        type=TransactionType.REVERSAL,
        points=-order.loyalty_points,
        reason=f"Pedido #{order.short_code} cancelado",
        order_id=order.id,
        order_code=order.short_code,
    )
    try:
        await tx.insert()
    except DuplicateKeyError:
        return False
    account = await _apply(order.customer_id, -order.loyalty_points, allow_negative=True)
    tx.balance_after = account.balance if account else None
    await tx.save()
    order.loyalty_credited = False
    await order.save()
    return True


async def adjust(customer_id: PydanticObjectId, points: int, reason: str, admin_id: PydanticObjectId) -> LoyaltyAccount:
    """Lançamento manual da equipe (ex.: compra no balcão). Débito nunca deixa o saldo negativo."""
    if points == 0:
        raise HTTPException(status_code=422, detail="Informe uma quantidade de pontos diferente de zero.")
    account = await _apply(customer_id, points, allow_negative=False)
    if account is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Saldo insuficiente para este débito.")
    await LoyaltyTransaction(
        customer_id=customer_id,
        type=TransactionType.ADJUST,
        points=points,
        reason=reason,
        admin_id=admin_id,
        balance_after=account.balance,
    ).insert()
    return account


async def on_order_status(order: Order, previous: OrderStatus) -> None:
    """Chamado pelo painel ao mudar o status de um pedido."""
    settings = await get_settings()
    if order.status.value == settings.credit_on_status:
        await credit_order(order)
    elif order.status == OrderStatus.CANCELADO and previous.value == settings.credit_on_status:
        await reverse_order(order)
    if order.status == OrderStatus.CANCELADO and previous != OrderStatus.CANCELADO:
        # resgates e presente de aniversário voltam para o cliente
        from app.services import reward_service

        await reward_service.release_order(order)


async def pending_points(customer_id: PydanticObjectId) -> tuple[int, int]:
    """Pontos de pedidos ainda em andamento (vão entrar quando forem entregues)."""
    orders = await Order.find(
        {
            "customer_id": customer_id,
            "loyalty_credited": False,
            "status": {"$in": [s.value for s in ACTIVE_STATUSES]},
        }
    ).to_list()
    return sum(o.loyalty_points for o in orders), len(orders)


# ---------------------------------------------------------------------------
# Resgates (pontos trocados por recompensas num pedido)
# ---------------------------------------------------------------------------


async def spend_for_order(customer_id: PydanticObjectId, points: int, order_id: PydanticObjectId, code: str) -> int:
    """Debita os pontos de um resgate. Atômico: falha com 409 se o saldo não cobrir."""
    account = await _apply(customer_id, -points, allow_negative=False, earned=False)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Saldo de pontos insuficiente para os resgates deste pedido.",
        )
    await LoyaltyTransaction(
        customer_id=customer_id,
        type=TransactionType.REDEEM,
        points=-points,
        reason=f"Resgate no pedido #{code[:4].upper()}",
        order_id=order_id,
        order_code=code[:4].upper(),
        balance_after=account.balance,
    ).insert()
    return account.balance


async def refund_redemption(customer_id: PydanticObjectId, points: int, order_id: PydanticObjectId, code: str) -> bool:
    """Devolve os pontos de um resgate (pedido cancelado). Idempotente pelo índice tipo+pedido."""
    tx = LoyaltyTransaction(
        customer_id=customer_id,
        type=TransactionType.REDEEM_REFUND,
        points=points,
        reason=f"Pedido #{code[:4].upper()} cancelado: pontos do resgate devolvidos",
        order_id=order_id,
        order_code=code[:4].upper(),
    )
    try:
        await tx.insert()
    except DuplicateKeyError:
        return False
    account = await _apply(customer_id, points, allow_negative=True, earned=False)
    tx.balance_after = account.balance if account else None
    await tx.save()
    return True
