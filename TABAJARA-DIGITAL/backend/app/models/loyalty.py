"""Clube Tabajara: regras, saldo por cliente e extrato imutável de pontos."""

from datetime import datetime
from enum import StrEnum

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.base import TimestampedDocument


class LoyaltySettings(TimestampedDocument):
    """Documento único com as regras, todas editáveis no painel."""

    enabled: bool = True
    points_per_real: float = Field(default=1.0, ge=0, le=100)
    min_order_cents: int = Field(default=0, ge=0)
    excluded_category_ids: list[PydanticObjectId] = Field(default_factory=list)
    # Status do pedido que libera os pontos (decidido: "entregue").
    credit_on_status: str = "entregue"
    # Recompensas: custo mínimo sugerido (o painel não deixa cadastrar abaixo disso).
    min_reward_points: int = Field(default=1000, ge=1)
    # Aniversário: um prato grátis por ano, no mês do aniversário.
    birthday_enabled: bool = False
    birthday_product_id: PydanticObjectId | None = None
    # antifraude: a data precisa estar no cadastro há pelo menos N dias
    birthday_min_days: int = Field(default=30, ge=0, le=365)

    class Settings:
        name = "loyalty_settings"


class LoyaltyAccount(TimestampedDocument):
    customer_id: PydanticObjectId
    balance: int = 0
    lifetime_earned: int = 0
    lifetime_spent: int = 0

    class Settings:
        name = "loyalty_accounts"
        indexes = [IndexModel([("customer_id", ASCENDING)], unique=True, name="uniq_account_customer")]


class TransactionType(StrEnum):
    EARN = "credito"  # compra validada
    REVERSAL = "estorno"  # pedido cancelado depois de creditado
    ADJUST = "ajuste"  # lançamento manual da equipe
    REDEEM = "resgate"  # troca por recompensa num pedido
    REDEEM_REFUND = "devolucao"  # pedido com resgate cancelado: pontos voltam


class LoyaltyTransaction(TimestampedDocument):
    """Movimentação imutável. O saldo é a soma do extrato."""

    customer_id: PydanticObjectId
    type: TransactionType
    points: int  # positivo = entrada, negativo = saída
    reason: str
    order_id: PydanticObjectId | None = None
    order_code: str | None = None
    admin_id: PydanticObjectId | None = None
    balance_after: int | None = None
    occurred_at: datetime | None = None

    class Settings:
        name = "loyalty_transactions"
        indexes = [
            IndexModel([("customer_id", ASCENDING), ("created_at", DESCENDING)], name="idx_tx_customer"),
            # Idempotência: no máximo UM crédito e UM estorno por pedido.
            IndexModel(
                [("type", ASCENDING), ("order_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"order_id": {"$type": "objectId"}},
                name="uniq_tx_type_order",
            ),
        ]
