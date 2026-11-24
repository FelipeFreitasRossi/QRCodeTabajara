"""Clube Tabajara: saldo, extrato, regras e estimativa de pontos."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.loyalty import TransactionType
from app.schemas.common import StrictModel
from app.schemas.order import OrderItemIn


class ClubPublicOut(BaseModel):
    enabled: bool
    points_per_real: float
    min_order_cents: int


class ClubEstimateIn(StrictModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)


class ClubEstimateOut(BaseModel):
    points: int


class ClubSummaryOut(BaseModel):
    balance: int
    lifetime_earned: int
    pending_points: int  # de pedidos ainda não entregues
    pending_orders: int
    points_per_real: float


class TransactionOut(BaseModel):
    id: str
    type: TransactionType
    points: int
    reason: str
    order_code: str | None
    balance_after: int | None
    created_at: datetime


class ClubSettingsIn(StrictModel):
    enabled: bool
    points_per_real: float = Field(ge=0, le=100)
    min_order_cents: int = Field(ge=0, le=10_000_000)
    excluded_category_ids: list[str] = Field(default_factory=list, max_length=100)
    min_reward_points: int = Field(default=1000, ge=1, le=1_000_000)
    birthday_enabled: bool = False
    birthday_product_id: str | None = None
    birthday_min_days: int = Field(default=30, ge=0, le=365)


class ClubSettingsOut(BaseModel):
    enabled: bool
    points_per_real: float
    min_order_cents: int
    excluded_category_ids: list[str]
    credit_on_status: str
    min_reward_points: int
    birthday_enabled: bool
    birthday_product_id: str | None
    birthday_min_days: int


class AdminCustomerOut(BaseModel):
    id: str
    name: str
    cpf_tail: str
    phone: str
    email: str | None
    balance: int
    lifetime_earned: int
    member_since: datetime
    locked: bool
    birthday: str | None = None  # "12/03"


class AdminAdjustIn(StrictModel):
    points: int = Field(ge=-100_000, le=100_000)
    reason: str = Field(min_length=3, max_length=200)


# ---------- Recompensas ----------


class RewardOut(BaseModel):
    id: str
    name: str
    description: str | None
    points_cost: int
    image_url: str | None
    product_id: str | None
    available: bool  # ativo e com estoque


class RewardAdminOut(RewardOut):
    active: bool
    stock: int | None
    position: int
    redeemed_count: int


class RewardIn(StrictModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    points_cost: int = Field(ge=1, le=1_000_000)
    product_id: str | None = None
    active: bool = True
    stock: int | None = Field(default=None, ge=0, le=100_000)
    position: int = Field(default=0, ge=0, le=10_000)


# ---------- Aniversário ----------


class BirthdayProductOut(BaseModel):
    id: str
    name: str
    image_url: str | None


class BirthdayOut(BaseModel):
    enabled: bool  # o restaurante oferece o presente
    has_date: bool  # cliente informou a data
    day: int | None = None
    month: int | None = None
    eligible: bool = False  # pode usar agora (mês do aniversário, ainda não usou este ano)
    used_this_year: bool = False
    available_from: datetime | None = None  # data informada há pouco: libera a partir de
    product: BirthdayProductOut | None = None
