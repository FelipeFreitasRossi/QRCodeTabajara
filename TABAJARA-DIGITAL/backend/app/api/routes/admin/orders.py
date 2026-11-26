from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_admin, get_or_404
from app.core.timeutils import start_of_today_utc
from app.models import AdminUser, Order, OrderStatus
from app.models.base import utc_now
from app.models.order import ACTIVE_STATUSES
from app.schemas.order import OrderAdminOut, OrderStatusIn
from app.services import loyalty_service
from app.services.order_service import to_admin

router = APIRouter(prefix="/orders", tags=["Admin · Pedidos"])


@router.get("", response_model=list[OrderAdminOut])
async def list_orders(days: int = Query(default=1, ge=1, le=60)) -> list[OrderAdminOut]:
    """Pedidos em andamento (de qualquer dia) + todos os pedidos do período (padrão: hoje)."""
    since = start_of_today_utc() - timedelta(days=days - 1)
    orders = (
        await Order.find(
            {"$or": [{"status": {"$in": [s.value for s in ACTIVE_STATUSES]}}, {"created_at": {"$gte": since}}]}
        )
        .sort("-created_at")
        .limit(500)
        .to_list()
    )
    return [to_admin(o) for o in orders]


@router.get("/{order_id}", response_model=OrderAdminOut)
async def get_order(order_id: str) -> OrderAdminOut:
    return to_admin(await get_or_404(Order, order_id, "Pedido não encontrado."))


@router.patch("/{order_id}/status", response_model=OrderAdminOut)
async def update_status(
    order_id: str, data: OrderStatusIn, admin: AdminUser = Depends(get_current_admin)
) -> OrderAdminOut:
    order = await get_or_404(Order, order_id, "Pedido não encontrado.")
    if order.status == OrderStatus.CANCELADO and data.status != OrderStatus.CANCELADO:
        # pontos, resgates e presente já foram devolvidos: reabrir causaria inconsistência
        raise HTTPException(status_code=409, detail="Pedido cancelado não pode ser reaberto. Faça um novo pedido.")
    if order.status != data.status:
        previous = order.status
        order.status = OrderStatus(data.status)
        order.status_updated_at = utc_now()
        if order.status == OrderStatus.CANCELADO:
            order.cancel_reason = (data.cancel_reason or "").strip() or None
            order.cancelled_by = admin.name
            order.cancelled_at = order.status_updated_at
        await order.save()
        # Clube: entregue -> credita os pontos; cancelado depois de entregue -> estorna.
        await loyalty_service.on_order_status(order, previous)
    return to_admin(order)
