"""Regras de pedidos. Preços sempre calculados no servidor (nunca confiamos no valor enviado pelo site)."""

import secrets

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.models import Customer, DiningTable, Order, OrderItem, Product
from app.schemas.order import OrderAdminOut, OrderCreateIn, OrderItemOut, OrderPublicOut
from app.services import loyalty_service, reward_service


def _invalid(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)


async def create_order(data: OrderCreateIn, customer: Customer | None = None) -> Order:
    table = await DiningTable.find_one({"number": data.table_number, "active": True})
    if table is None:
        raise _invalid(f"A mesa {data.table_number} não está cadastrada. Confira o número com um atendente.")

    wants_club = bool(data.rewards) or data.birthday_gift
    if wants_club and customer is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Entre no Clube Tabajara para usar pontos ou o presente de aniversário.",
        )

    # Junta itens repetidos do mesmo produto.
    quantities: dict[str, int] = {}
    for item in data.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    try:
        ids = [PydanticObjectId(product_id) for product_id in quantities]
    except (InvalidId, TypeError, ValueError):
        raise _invalid("Há um item inválido no carrinho. Atualize a página e tente novamente.") from None

    products = {str(p.id): p for p in await Product.find({"_id": {"$in": ids}}).to_list()} if ids else {}

    missing = [pid for pid in quantities if pid not in products]
    if missing:
        raise _invalid("Alguns itens do carrinho não existem mais no cardápio. Atualize a página e revise o pedido.")

    unavailable = [products[pid].name for pid in quantities if not products[pid].available]
    if unavailable:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Indisponível no momento: {', '.join(unavailable)}. Remova do carrinho para continuar.",
        )

    items = [
        OrderItem(
            product_id=products[pid].id,
            name=products[pid].name,
            unit_price_cents=products[pid].price_cents,
            quantity=min(quantity, 20),
        )
        for pid, quantity in quantities.items()
    ]
    total = sum(item.subtotal_cents for item in items)
    # Pontos do Clube: só para cliente identificado e só sobre o que foi pago;
    # entram no saldo quando o pedido é entregue.
    points = await loyalty_service.estimate_points(quantities) if customer else 0

    # Resgates e presente: validados e montados no servidor.
    extra_items: list[OrderItem] = []
    points_cost = 0
    reserved: list = []
    gift = False
    if wants_club and customer is not None:
        extra_items, points_cost, reserved, gift = await reward_service.build_items(
            customer, data.rewards, data.birthday_gift
        )

    code = secrets.token_hex(5)
    while await Order.find_one({"code": code}):
        code = secrets.token_hex(5)
    order = Order(
        id=PydanticObjectId(),
        code=code,
        table_number=data.table_number,
        customer_name=data.customer_name,
        notes=data.notes or None,
        items=items + extra_items,
        total_cents=total,
        customer_id=customer.id if customer else None,
        loyalty_points=points,
        points_spent=points_cost,
        birthday_gift=gift,
    )
    if wants_club and customer is not None:
        await reward_service.reserve(customer, order.id, code, points_cost, reserved, gift)
    try:
        await order.insert()
    except Exception:
        if wants_club and customer is not None:
            await reward_service.release_order(order)
        raise
    if reserved:
        await reward_service.confirm(reserved)
    return order


def _items_out(order: Order) -> list[OrderItemOut]:
    return [
        OrderItemOut(
            product_id=str(item.product_id) if item.product_id else None,
            name=item.name,
            unit_price_cents=item.unit_price_cents,
            quantity=item.quantity,
            subtotal_cents=item.subtotal_cents,
            kind=item.kind.value,
            points_cost=item.points_cost,
        )
        for item in order.items
    ]


def to_public(order: Order) -> OrderPublicOut:
    return OrderPublicOut(
        code=order.code,
        short_code=order.short_code,
        table_number=order.table_number,
        customer_name=order.customer_name,
        notes=order.notes,
        items=_items_out(order),
        total_cents=order.total_cents,
        status=order.status,
        created_at=order.created_at,
        status_updated_at=order.status_updated_at,
        loyalty_points=order.loyalty_points,
        loyalty_credited=order.loyalty_credited,
        points_spent=order.points_spent,
        birthday_gift=order.birthday_gift,
    )


def to_admin(order: Order) -> OrderAdminOut:
    return OrderAdminOut(
        id=str(order.id),
        customer_id=str(order.customer_id) if order.customer_id else None,
        **to_public(order).model_dump(),
    )
