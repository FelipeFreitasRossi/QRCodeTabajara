from datetime import timedelta

from fastapi import APIRouter, Depends, Path

from app.api.deps import get_current_admin, get_or_404
from app.models import AdminUser
from app.models.base import utc_now
from app.models.waiter_call import CallReason, CallStatus, WaiterCall
from app.schemas.bill import BillCloseIn, BillClosedOut, BillOut
from app.schemas.waiter_call import CallAdminOut
from app.services import bill_service
from app.services.waiter_call_service import admin_out, attend

router = APIRouter(prefix="/chamados", tags=["Admin · Chamados"])

RECENT = timedelta(hours=3)


@router.get("", response_model=list[CallAdminOut])
async def list_calls() -> list[CallAdminOut]:
    """Chamados abertos (o mais antigo primeiro) e os encerrados nas últimas 3 horas."""
    open_calls = await WaiterCall.find({"status": CallStatus.ABERTO.value}).sort("+created_at").to_list()
    recent = (
        await WaiterCall.find({"status": {"$ne": CallStatus.ABERTO.value}, "updated_at": {"$gte": utc_now() - RECENT}})
        .sort("-updated_at")
        .limit(40)
        .to_list()
    )
    result = [admin_out(c) for c in [*open_calls, *recent]]
    # "Pedir a conta": junta o resumo da conta da mesa, para o garçom saber o que cobrar.
    for out, call in zip(result, open_calls, strict=False):
        if call.reason == CallReason.CONTA and call.table_number is not None:
            out.bill = await bill_service.summary(call.table_number)
    return result


@router.post("/{call_id}/atender", response_model=CallAdminOut)
async def mark_attended(call_id: str, admin: AdminUser = Depends(get_current_admin)) -> CallAdminOut:
    call = await get_or_404(WaiterCall, call_id, "Chamado não encontrado.")
    return admin_out(await attend(call, admin.name))


# ---------- Conta da mesa ----------
TABLE = Path(ge=1, le=9999)


@router.get("/conta/{table_number}", response_model=BillOut)
async def table_bill(table_number: int = TABLE) -> BillOut:
    """Pedidos da mesa ainda não fechados (o que o garçom vai cobrar)."""
    return await bill_service.bill(table_number)


@router.post("/conta/{table_number}/fechar", response_model=BillClosedOut)
async def close_table_bill(
    data: BillCloseIn, table_number: int = TABLE, admin: AdminUser = Depends(get_current_admin)
) -> BillClosedOut:
    """Fecha a conta: só os pedidos mostrados ao garçom. Também encerra o chamado de conta da mesa."""
    closed = await bill_service.close(table_number, data.order_ids, admin.name, data.payment_method)
    open_calls = await WaiterCall.find({"table_number": table_number, "status": CallStatus.ABERTO.value}).to_list()
    for call in open_calls:
        await attend(call, admin.name)
    return closed
