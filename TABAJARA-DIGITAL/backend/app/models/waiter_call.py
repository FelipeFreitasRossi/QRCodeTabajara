"""Chamado de atendente feito pelo cliente, pelo QR de chamar da mesa (/chamar/<qr_token>).

Sem QR (só em desenvolvimento), o chamado fica "sem mesa": table_id e table_number vazios.
"""

from datetime import datetime
from enum import Enum

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.base import TimestampedDocument


class CallReason(str, Enum):
    ATENDENTE = "atendente"  # chamar atendente
    CONTA = "conta"  # pedir a conta
    AJUDA = "ajuda"  # ajuda com o pedido


class CallStatus(str, Enum):
    ABERTO = "aberto"
    ATENDIDO = "atendido"
    CANCELADO = "cancelado"  # o próprio cliente cancelou


class WaiterCall(TimestampedDocument):
    table_id: PydanticObjectId | None = None
    table_number: int | None = None
    table_label: str | None = None
    reason: CallReason
    status: CallStatus = CallStatus.ABERTO
    # Quantas vezes o cliente tocou de novo enquanto esperava (a equipe vê "chamou 3×").
    repeats: int = Field(default=0, ge=0)
    attended_at: datetime | None = None
    attended_by: str | None = None  # nome do administrador que marcou como atendido
    closed_at: datetime | None = None

    class Settings:
        name = "waiter_calls"
        indexes = [
            # No máximo UM chamado aberto por mesa (evita duplicados mesmo com toques simultâneos).
            IndexModel(
                [("table_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"status": "aberto"},
                name="uniq_open_call_per_table",
            ),
            IndexModel([("status", ASCENDING), ("created_at", ASCENDING)], name="calls_by_status"),
            IndexModel([("table_id", ASCENDING), ("updated_at", DESCENDING)], name="calls_by_table"),
        ]
