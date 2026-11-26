"""Pedido feito pelo cliente no site."""

from datetime import datetime
from enum import StrEnum

from beanie import PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.base import TimestampedDocument, utc_now


class OrderStatus(StrEnum):
    RECEBIDO = "recebido"
    EM_PREPARO = "em_preparo"
    PRONTO = "pronto"
    ENTREGUE = "entregue"
    CANCELADO = "cancelado"


ACTIVE_STATUSES = [OrderStatus.RECEBIDO, OrderStatus.EM_PREPARO, OrderStatus.PRONTO]


class ItemKind(StrEnum):
    PRODUCT = "produto"
    REWARD = "resgate"  # trocado por pontos do Clube
    BIRTHDAY = "aniversario"  # presente de aniversário


class OrderItem(BaseModel):
    product_id: PydanticObjectId | None = None  # resgate sem prato vinculado não tem produto
    # Nome e preço copiados no momento do pedido: alterações futuras no cardápio
    # não mudam pedidos já feitos.
    name: str
    unit_price_cents: int = Field(ge=0)
    quantity: int = Field(ge=1)
    kind: ItemKind = ItemKind.PRODUCT
    points_cost: int = 0  # por unidade, nos resgates
    reward_id: PydanticObjectId | None = None

    @property
    def subtotal_cents(self) -> int:
        return self.unit_price_cents * self.quantity


class Order(TimestampedDocument):
    code: str  # código aleatório usado na página de acompanhamento do cliente
    table_number: int = Field(ge=1)
    customer_name: str
    notes: str | None = None
    items: list[OrderItem]
    total_cents: int = Field(ge=0)
    status: OrderStatus = OrderStatus.RECEBIDO
    status_updated_at: datetime = Field(default_factory=utc_now)

    # Clube Tabajara (opcional): cliente identificado no fechamento do pedido.
    customer_id: PydanticObjectId | None = None
    loyalty_points: int = 0  # pontos que o pedido vale (calculados no servidor)
    loyalty_credited: bool = False  # True depois que os pontos entraram no saldo
    points_spent: int = 0  # pontos trocados por recompensas neste pedido
    redemption_refunded: bool = False  # pedido cancelado: pontos dos resgates devolvidos
    birthday_gift: bool = False
    # Conta da mesa: preenchido quando o garçom fecha a conta (os próximos clientes da mesa começam do zero).
    bill_closed_at: datetime | None = None
    bill_closed_by: str | None = None
    bill_payment: str | None = None  # forma de pagamento informada ao fechar a conta (opcional)
    # Cancelamento pelo painel: motivo e quem cancelou (registro para a gerência).
    cancel_reason: str | None = None
    cancelled_by: str | None = None
    cancelled_at: datetime | None = None

    class Settings:
        name = "orders"
        indexes = [
            IndexModel([("code", ASCENDING)], unique=True, name="uniq_order_code"),
            IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="idx_order_status"),
            IndexModel([("created_at", DESCENDING)], name="idx_order_created"),
            IndexModel([("table_number", ASCENDING), ("created_at", DESCENDING)], name="idx_order_table"),
        ]

    @property
    def short_code(self) -> str:
        return self.code[:4].upper()
