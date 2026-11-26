"""Conta da mesa: os pedidos da mesa que ainda não foram fechados pelo garçom.

- Entram todos os pedidos da mesa, menos os cancelados, feitos nas últimas CONTA_JANELA horas
  e ainda sem `bill_closed_at`.
- Ao "Fechar conta", o garçom fecha exatamente os pedidos que viu na tela. Os próximos clientes
  daquela mesa começam com a conta zerada.
- A janela de horas evita que um esquecimento (conta não fechada ontem) apareça na conta de hoje.
"""

from datetime import timedelta

from beanie import PydanticObjectId
from bson.errors import InvalidId

from app.models import Order, OrderStatus
from app.models.base import utc_now
from app.models.order import ACTIVE_STATUSES
from app.schemas.bill import BillClosedOut, BillItemOut, BillOrderOut, BillOut, BillSummaryOut

CONTA_JANELA = timedelta(hours=12)


def _open_filter(table_number: int) -> dict:
    return {
        "table_number": table_number,
        "status": {"$ne": OrderStatus.CANCELADO.value},
        "bill_closed_at": None,
        "created_at": {"$gte": utc_now() - CONTA_JANELA},
    }


async def open_orders(table_number: int) -> list[Order]:
    return await Order.find(_open_filter(table_number)).sort("+created_at").to_list()


def _summary(orders: list[Order]) -> dict:
    names: list[str] = []
    for order in orders:
        name = order.customer_name.strip()
        if name and name.lower() not in {n.lower() for n in names}:
            names.append(name)
    return {
        "orders_count": len(orders),
        "total_cents": sum(o.total_cents for o in orders),
        "names": names,
        "since": orders[0].created_at if orders else None,
        "unfinished": sum(1 for o in orders if o.status in ACTIVE_STATUSES),
    }


async def summary(table_number: int) -> BillSummaryOut:
    return BillSummaryOut(**_summary(await open_orders(table_number)))


async def bill(table_number: int) -> BillOut:
    orders = await open_orders(table_number)
    return BillOut(
        table_number=table_number,
        orders=[
            BillOrderOut(
                id=str(o.id),
                short_code=o.short_code,
                customer_name=o.customer_name,
                status=o.status.value,
                created_at=o.created_at,
                total_cents=o.total_cents,
                items=[
                    BillItemOut(name=i.name, quantity=i.quantity, subtotal_cents=i.subtotal_cents, kind=i.kind.value)
                    for i in o.items
                ],
            )
            for o in orders
        ],
        **_summary(orders),
    )


async def close(table_number: int, order_ids: list[str], closed_by: str, payment: str | None = None) -> BillClosedOut:
    ids: list[PydanticObjectId] = []
    for raw in order_ids:
        try:
            ids.append(PydanticObjectId(raw))
        except (InvalidId, TypeError, ValueError):
            continue
    query = {**_open_filter(table_number), "_id": {"$in": ids}}
    orders = await Order.find(query).to_list()
    if orders:
        await Order.get_pymongo_collection().update_many(
            {"_id": {"$in": [o.id for o in orders]}, "bill_closed_at": None},
            {"$set": {"bill_closed_at": utc_now(), "bill_closed_by": closed_by, "bill_payment": payment}},
        )
    return BillClosedOut(
        table_number=table_number,
        closed_orders=len(orders),
        total_cents=sum(o.total_cents for o in orders),
    )
