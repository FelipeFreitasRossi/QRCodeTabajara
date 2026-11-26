"""Rotas públicas do cardápio e dos pedidos. Não exigem login."""

import re

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response, status

from app.api.deps import get_optional_customer
from app.core.rate_limit import order_limiter
from app.models import Customer, DiningTable, Order
from app.schemas.order import OrderCreateIn, OrderPublicOut, PublicTableNumber
from app.schemas.public import PublicMenu
from app.schemas.waiter_call import CallCreateIn, CallPageOut
from app.services import menu_service, order_service, waiter_call_service

router = APIRouter(prefix="/public", tags=["Cardápio público"])

ORDER_CODE_PATTERN = re.compile(r"^[a-f0-9]{10}$")


@router.get("/cardapio", response_model=PublicMenu)
async def get_menu(response: Response) -> PublicMenu:
    # Sem cache: alterações do painel aparecem imediatamente para o cliente.
    response.headers["Cache-Control"] = "no-store"
    return await menu_service.build_public_menu()


@router.get("/mesas", response_model=list[PublicTableNumber])
async def list_tables() -> list[PublicTableNumber]:
    """Mesas ativas, para o cliente escolher ao finalizar o pedido."""
    tables = await DiningTable.find({"active": True}).sort("+number").to_list()
    return [PublicTableNumber(number=t.number, label=t.label) for t in tables]


@router.get("/mesas/qr/{token}", response_model=PublicTableNumber)
async def table_by_qr(token: str = Path(min_length=4, max_length=40)) -> PublicTableNumber:
    # Mesa do QR Code escaneado: o cardápio abre já sabendo a mesa.
    table = await DiningTable.find_one({"qr_token": token, "active": True})
    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este QR Code não está ativo. Escolha a mesa ao finalizar o pedido ou chame um atendente.",
        )
    return PublicTableNumber(number=table.number, label=table.label)


@router.post("/pedidos", response_model=OrderPublicOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreateIn,
    request: Request,
    customer: Customer | None = Depends(get_optional_customer),
) -> OrderPublicOut:
    order_limiter.check(request)
    order = await order_service.create_order(data, customer)
    return order_service.to_public(order)


@router.get("/pedidos/{code}", response_model=OrderPublicOut)
async def get_order(response: Response, code: str = Path(max_length=20)) -> OrderPublicOut:
    """Acompanhamento do pedido pelo cliente (o código é aleatório e difícil de adivinhar)."""
    response.headers["Cache-Control"] = "no-store"
    order = await Order.find_one({"code": code.lower()}) if ORDER_CODE_PATTERN.match(code.lower()) else None
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    return order_service.to_public(order)


# ---------- Chamar atendente (QR de chamar da mesa: /chamar/<qr_token>) ----------

QR_TOKEN = Path(min_length=4, max_length=40)


# Sem QR: o próprio cliente escolhe a mesa. Liberado em desenvolvimento; no site publicado só com
# CALL_BY_NUMBER=true. (Rotas com dois segmentos: não se confundem com /chamados/{token}.)
TABLE_NUMBER = Path(ge=1, le=9999)


@router.get("/chamados/mesa/{number}", response_model=CallPageOut)
async def call_page_by_number(number: int = TABLE_NUMBER) -> CallPageOut:
    table = await waiter_call_service.table_by_number(number)
    return await waiter_call_service.page_state(table)


@router.post("/chamados/mesa/{number}", response_model=CallPageOut, status_code=status.HTTP_201_CREATED)
async def create_call_by_number(data: CallCreateIn, request: Request, number: int = TABLE_NUMBER) -> CallPageOut:
    table = await waiter_call_service.table_by_number(number)
    return await waiter_call_service.create_call(table, data.reason, request)


@router.post("/chamados/mesa/{number}/cancelar", response_model=CallPageOut)
async def cancel_call_by_number(number: int = TABLE_NUMBER) -> CallPageOut:
    table = await waiter_call_service.table_by_number(number)
    return await waiter_call_service.cancel_call(table)


@router.get("/chamados/{token}", response_model=CallPageOut)
async def call_page(token: str = QR_TOKEN) -> CallPageOut:
    """Mesa do QR e o chamado atual. A página consulta de tempos em tempos para saber se já foi atendido."""
    table = await waiter_call_service.table_by_token(token)
    return await waiter_call_service.page_state(table)


@router.post("/chamados/{token}", response_model=CallPageOut, status_code=status.HTTP_201_CREATED)
async def create_call(data: CallCreateIn, request: Request, token: str = QR_TOKEN) -> CallPageOut:
    table = await waiter_call_service.table_by_token(token)
    return await waiter_call_service.create_call(table, data.reason, request)


@router.post("/chamados/{token}/cancelar", response_model=CallPageOut)
async def cancel_call(token: str = QR_TOKEN) -> CallPageOut:
    table = await waiter_call_service.table_by_token(token)
    return await waiter_call_service.cancel_call(table)
