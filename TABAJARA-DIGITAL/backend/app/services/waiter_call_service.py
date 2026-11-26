"""Regras do "Chamar atendente".

- O cliente só chama pelo código secreto do QR da mesa (não dá para chamar "a mesa 8" de casa).
- Cada mesa tem no máximo um chamado aberto. Tocar de novo atualiza o motivo e conta a repetição.
- Depois de cancelar ou ser atendido, há um intervalo curto antes de poder chamar de novo.
"""

from datetime import timedelta

from fastapi import HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.rate_limit import call_ip_limiter, call_table_limiter
from app.models import DiningTable
from app.models.base import utc_now
from app.models.waiter_call import CallReason, CallStatus, WaiterCall
from app.schemas.order import PublicTableNumber
from app.schemas.waiter_call import CallAdminOut, CallPageOut, CallPublicOut

# Depois de atendido, a página mostra "Atendido" por este tempo.
SHOW_ATTENDED_FOR = timedelta(minutes=3)
# Intervalo mínimo entre fechar um chamado e abrir outro na mesma mesa.
COOLDOWN = timedelta(seconds=20)
# "Pedir a conta" é mais específico: se a mesa pedir a conta, isso prevalece sobre um chamado genérico.
REASON_WEIGHT = {CallReason.AJUDA: 0, CallReason.ATENDENTE: 1, CallReason.CONTA: 2}

QR_INACTIVE = "Este QR Code não está ativo. Por favor, chame um atendente pessoalmente."


async def table_by_number(number: int) -> DiningTable:
    """Mesa escolhida pelo próprio cliente (site aberto sem o QR).

    Liberado em desenvolvimento; no site publicado só com CALL_BY_NUMBER=true, porque qualquer pessoa,
    mesmo fora do restaurante, poderia escolher uma mesa e chamar. Com o QR, use table_by_token.
    """
    if not settings.allow_call_by_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Para chamar um atendente, use o QR Code \"Chamar atendente\" da sua mesa.",
        )
    table = await DiningTable.find_one({"number": number, "active": True})
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada.")
    return table


async def table_by_token(token: str) -> DiningTable:
    table = await DiningTable.find_one({"qr_token": token, "active": True})
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=QR_INACTIVE)
    return table


def public_out(call: WaiterCall) -> CallPublicOut:
    return CallPublicOut(
        id=str(call.id),
        reason=call.reason,
        status=call.status,
        created_at=call.created_at,
        attended_at=call.attended_at,
    )


def admin_out(call: WaiterCall) -> CallAdminOut:
    return CallAdminOut(
        id=str(call.id),
        table_number=call.table_number,
        table_label=call.table_label,
        reason=call.reason,
        status=call.status,
        repeats=call.repeats,
        created_at=call.created_at,
        updated_at=call.updated_at,
        attended_at=call.attended_at,
        attended_by=call.attended_by,
    )


def _table_id(table: DiningTable | None):
    return table.id if table else None


async def _open_call(table: DiningTable | None) -> WaiterCall | None:
    return await WaiterCall.find_one({"table_id": _table_id(table), "status": CallStatus.ABERTO.value})


async def _last_closed(table: DiningTable | None) -> WaiterCall | None:
    return (
        await WaiterCall.find({"table_id": _table_id(table), "status": {"$ne": CallStatus.ABERTO.value}})
        .sort("-updated_at")
        .first_or_none()
    )


def _cooldown_left(last: WaiterCall | None) -> int:
    if last is None or last.closed_at is None:
        return 0
    left = (last.closed_at + COOLDOWN) - utc_now()
    return max(0, int(left.total_seconds() + 0.999))


async def page_state(table: DiningTable | None) -> CallPageOut:
    call = await _open_call(table)
    last = await _last_closed(table)
    if call is None and last and last.status == CallStatus.ATENDIDO and last.attended_at:
        if utc_now() - last.attended_at <= SHOW_ATTENDED_FOR:
            call = last
    return CallPageOut(
        table=PublicTableNumber(number=table.number, label=table.label) if table else None,
        call=public_out(call) if call else None,
        cooldown_seconds=_cooldown_left(last) if table is not None else 0,
    )


async def create_call(table: DiningTable | None, reason: CallReason, request: Request) -> CallPageOut:
    call_ip_limiter.check(request)

    existing = await _open_call(table)
    if existing:
        # Já está chamando: não cria outro; atualiza o motivo se for mais importante e conta o toque.
        if REASON_WEIGHT[reason] > REASON_WEIGHT[existing.reason]:
            existing.reason = reason
        existing.repeats += 1
        await existing.save()
        return await page_state(table)

    if table is not None:
        if _cooldown_left(await _last_closed(table)) > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Aguarde alguns segundos para chamar de novo.",
            )
        # Limite por mesa só no site publicado: em desenvolvimento não trava quem está testando.
        if settings.is_production:
            call_table_limiter.check_key(str(table.id))

    call = WaiterCall(
        table_id=_table_id(table),
        table_number=table.number if table else None,
        table_label=table.label if table else None,
        reason=reason,
    )
    try:
        await call.insert()
    except DuplicateKeyError:
        # Dois toques ao mesmo tempo: o outro já abriu o chamado.
        pass
    return await page_state(table)


async def cancel_call(table: DiningTable | None) -> CallPageOut:
    call = await _open_call(table)
    if call:
        call.status = CallStatus.CANCELADO
        call.closed_at = utc_now()
        await call.save()
    return await page_state(table)


async def attend(call: WaiterCall, admin_name: str) -> WaiterCall:
    if call.status == CallStatus.ABERTO:
        now = utc_now()
        call.status = CallStatus.ATENDIDO
        call.attended_at = now
        call.closed_at = now
        call.attended_by = admin_name
        await call.save()
    return call
