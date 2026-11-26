"""Pedidos: dados enviados pelo cliente e respostas para o cliente e para o painel."""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.order import OrderStatus
from app.schemas.common import StrictModel


class OrderItemIn(StrictModel):
    product_id: str = Field(max_length=24)
    quantity: int = Field(ge=1, le=20)


class RewardItemIn(StrictModel):
    reward_id: str = Field(max_length=24)
    quantity: int = Field(default=1, ge=1, le=5)


class OrderCreateIn(StrictModel):
    customer_name: str = Field(min_length=2, max_length=60)
    table_number: int = Field(ge=1, le=999)
    notes: str | None = Field(default=None, max_length=300)
    items: list[OrderItemIn] = Field(default_factory=list, max_length=50)
    # Clube (exigem cliente identificado): recompensas trocadas por pontos e o presente de aniversário.
    rewards: list[RewardItemIn] = Field(default_factory=list, max_length=5)
    birthday_gift: bool = False

    @model_validator(mode="after")
    def _not_empty(self):
        if not self.items and not self.rewards and not self.birthday_gift:
            raise ValueError("O carrinho está vazio.")
        return self


class OrderItemOut(BaseModel):
    product_id: str | None
    name: str
    unit_price_cents: int
    quantity: int
    subtotal_cents: int
    kind: str = "produto"  # produto | resgate | aniversario
    points_cost: int = 0


class OrderPublicOut(BaseModel):
    """O que o cliente vê na página de acompanhamento."""

    code: str
    short_code: str
    table_number: int
    customer_name: str
    notes: str | None
    items: list[OrderItemOut]
    total_cents: int
    status: OrderStatus
    created_at: datetime
    status_updated_at: datetime
    loyalty_points: int = 0
    loyalty_credited: bool = False
    points_spent: int = 0
    birthday_gift: bool = False


class OrderAdminOut(OrderPublicOut):
    id: str
    customer_id: str | None = None
    cancel_reason: str | None = None
    cancelled_by: str | None = None


class OrderStatusIn(StrictModel):
    status: OrderStatus
    # Motivo do cancelamento (o painel exige; aqui é opcional para não quebrar outros usos).
    cancel_reason: str | None = Field(default=None, max_length=200)


class PublicTableNumber(BaseModel):
    number: int
    label: str | None


class DashboardOut(BaseModel):
    orders_today: int
    revenue_today_cents: int
    active_orders: int
    pending_orders: int
    products: int
    unavailable_products: int
    categories: int
    recent_orders: list[OrderAdminOut]
