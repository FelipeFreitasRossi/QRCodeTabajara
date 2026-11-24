from fastapi import APIRouter

from app.core.timeutils import start_of_today_utc
from app.models import Category, Order, OrderStatus, Product
from app.models.order import ACTIVE_STATUSES
from app.schemas.order import DashboardOut
from app.services.order_service import to_admin

router = APIRouter(prefix="/dashboard", tags=["Admin · Painel"])


@router.get("", response_model=DashboardOut)
async def dashboard() -> DashboardOut:
    today = start_of_today_utc()
    todays_orders = await Order.find({"created_at": {"$gte": today}}).to_list()
    valid_today = [o for o in todays_orders if o.status != OrderStatus.CANCELADO]
    recent = await Order.find_all().sort("-created_at").limit(6).to_list()
    return DashboardOut(
        orders_today=len(valid_today),
        revenue_today_cents=sum(o.total_cents for o in valid_today),
        active_orders=await Order.find({"status": {"$in": [s.value for s in ACTIVE_STATUSES]}}).count(),
        pending_orders=await Order.find({"status": OrderStatus.RECEBIDO.value}).count(),
        products=await Product.find_all().count(),
        unavailable_products=await Product.find({"available": False}).count(),
        categories=await Category.find_all().count(),
        recent_orders=[to_admin(o) for o in recent],
    )
