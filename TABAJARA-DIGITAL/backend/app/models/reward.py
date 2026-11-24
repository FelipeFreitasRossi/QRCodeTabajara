"""Recompensas do Clube Tabajara (trocadas por pontos) e presentes de aniversário."""

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class Reward(TimestampedDocument):
    """Item do catálogo de recompensas. Pode usar um prato do cardápio (nome/foto) ou ser próprio."""

    name: str
    description: str | None = None
    points_cost: int = Field(ge=1)
    product_id: PydanticObjectId | None = None  # prato do cardápio entregue no resgate (foto e cozinha)
    image_url: str | None = None  # se vazio, usa a foto do prato vinculado
    active: bool = True
    stock: int | None = Field(default=None, ge=0)  # None = sem limite
    position: int = 0
    redeemed_count: int = 0

    class Settings:
        name = "rewards"
        indexes = [IndexModel([("active", ASCENDING), ("position", ASCENDING)], name="idx_reward_active")]


class BirthdayGift(TimestampedDocument):
    """Presente de aniversário usado num pedido. Único por cliente e ano (índice)."""

    customer_id: PydanticObjectId
    year: int
    order_id: PydanticObjectId

    class Settings:
        name = "birthday_gifts"
        indexes = [
            IndexModel([("customer_id", ASCENDING), ("year", ASCENDING)], unique=True, name="uniq_gift_customer_year"),
        ]
