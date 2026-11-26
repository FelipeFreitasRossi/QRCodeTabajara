from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import StrictModel


class BillItemOut(BaseModel):
    name: str
    quantity: int
    subtotal_cents: int
    kind: str  # produto | resgate | aniversario


class BillOrderOut(BaseModel):
    id: str
    short_code: str
    customer_name: str
    status: str
    created_at: datetime
    total_cents: int
    items: list[BillItemOut]


class BillSummaryOut(BaseModel):
    """Resumo que aparece no cartão do chamado "Pedir a conta"."""

    orders_count: int
    total_cents: int
    names: list[str]  # quem pediu (nome informado em cada pedido)
    since: datetime | None  # horário do primeiro pedido da conta
    unfinished: int  # pedidos ainda não entregues (recebido / em preparo / pronto)


class BillOut(BillSummaryOut):
    table_number: int
    orders: list[BillOrderOut]


class BillCloseIn(StrictModel):
    # Fecha exatamente os pedidos que o garçom viu na tela (um pedido que chegue no meio não entra por engano).
    order_ids: list[str] = Field(min_length=1, max_length=200)
    payment_method: Literal["pix", "credito", "debito", "dinheiro", "outro"] | None = None


class BillClosedOut(BaseModel):
    table_number: int
    closed_orders: int
    total_cents: int
