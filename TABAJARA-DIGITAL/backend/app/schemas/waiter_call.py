from datetime import datetime

from pydantic import BaseModel, Field

from app.models.waiter_call import CallReason, CallStatus
from app.schemas.bill import BillSummaryOut
from app.schemas.common import StrictModel
from app.schemas.order import PublicTableNumber


class CallCreateIn(StrictModel):
    reason: CallReason = CallReason.ATENDENTE


class CallPublicOut(BaseModel):
    id: str
    reason: CallReason
    status: CallStatus
    created_at: datetime
    attended_at: datetime | None


class CallPageOut(BaseModel):
    """Tudo o que a página de chamar precisa: a mesa e o chamado atual (ou o que acabou de ser atendido)."""

    table: PublicTableNumber | None  # None: aberto sem o QR (chamado "sem mesa")
    call: CallPublicOut | None
    # Segundos até o cliente poder chamar de novo depois de cancelar/ser atendido (anti-brincadeira).
    cooldown_seconds: int = Field(default=0, ge=0)


class CallAdminOut(BaseModel):
    id: str
    table_number: int | None  # None: chamado sem mesa (teste sem QR)
    table_label: str | None
    reason: CallReason
    status: CallStatus
    repeats: int
    created_at: datetime
    updated_at: datetime
    attended_at: datetime | None
    attended_by: str | None
    # Só nos chamados "Pedir a conta" abertos de uma mesa: o que o garçom vai cobrar.
    bill: BillSummaryOut | None = None
