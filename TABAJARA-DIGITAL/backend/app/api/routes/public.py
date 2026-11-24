"""Rotas públicas do cardápio e dos pedidos. Não exigem login."""

import re

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response, status

from app.api.deps import get_optional_customer
from app.core.rate_limit import order_limiter
from app.models import Customer, DiningTable, Order
from app.schemas.order import OrderCreateIn, OrderPublicOut, PublicTableNumber
from app.schemas.public import PublicMenu
from app.services import menu_service, order_service

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
