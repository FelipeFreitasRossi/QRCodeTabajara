"""Conta do cliente do Clube Tabajara: cadastro, login com CPF + PIN e dados pessoais."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models.base import utc_now
from app.api.deps import get_current_customer, parse_object_id
from app.core.rate_limit import customer_login_limiter, customer_register_limiter
from app.models import Customer, Product
from app.schemas.customer import (
    BirthdayIn,
    CustomerLoginIn,
    CustomerOut,
    CustomerRegisterIn,
    CustomerSessionOut,
    CustomerUpdateIn,
)
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["Clube · Conta do cliente"])


@router.post("/register", response_model=CustomerSessionOut, status_code=status.HTTP_201_CREATED)
async def register(data: CustomerRegisterIn, request: Request) -> CustomerSessionOut:
    customer_register_limiter.check(request)
    customer = await customer_service.register(data)
    return customer_service.session_out(customer, data.remember)


@router.post("/login", response_model=CustomerSessionOut)
async def login(data: CustomerLoginIn, request: Request) -> CustomerSessionOut:
    customer_login_limiter.check(request)
    customer = await customer_service.authenticate(data.cpf, data.pin)
    return customer_service.session_out(customer, data.remember)


@router.get("/me", response_model=CustomerOut)
async def me(customer: Customer = Depends(get_current_customer)) -> CustomerOut:
    return customer_service.customer_out(customer)


@router.put("/me", response_model=CustomerOut)
async def update_me(data: CustomerUpdateIn, customer: Customer = Depends(get_current_customer)) -> CustomerOut:
    customer.name = data.name
    customer.phone = data.phone
    customer.email = (data.email or "").strip().lower() or None
    await customer.save()
    return customer_service.customer_out(customer)


# ---------- Favoritos (o coração) — só com cadastro, para aparecerem na próxima visita ----------

MAX_FAVORITES = 100


def _favorites_out(customer: Customer) -> list[str]:
    return [str(pid) for pid in customer.favorite_product_ids]


@router.get("/me/favorites", response_model=list[str])
async def my_favorites(customer: Customer = Depends(get_current_customer)) -> list[str]:
    return _favorites_out(customer)


@router.put("/me/favorites/{product_id}", response_model=list[str])
async def add_favorite(product_id: str, customer: Customer = Depends(get_current_customer)) -> list[str]:
    pid = parse_object_id(product_id, "Prato não encontrado.")
    if not await Product.get(pid):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prato não encontrado.")
    if pid not in customer.favorite_product_ids:
        customer.favorite_product_ids = [pid, *customer.favorite_product_ids][:MAX_FAVORITES]
        await customer.save()
    return _favorites_out(customer)


@router.delete("/me/favorites/{product_id}", response_model=list[str])
async def remove_favorite(product_id: str, customer: Customer = Depends(get_current_customer)) -> list[str]:
    pid = parse_object_id(product_id, "Prato não encontrado.")
    if pid in customer.favorite_product_ids:
        customer.favorite_product_ids = [p for p in customer.favorite_product_ids if p != pid]
        await customer.save()
    return _favorites_out(customer)


@router.put("/me/birthday", response_model=CustomerOut)
async def set_birthday(data: BirthdayIn, customer: Customer = Depends(get_current_customer)) -> CustomerOut:
    """O cliente informa o aniversário uma vez. Para mudar depois, só com a equipe (evita fraude no presente)."""
    if customer.birth_month is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seu aniversário já está cadastrado. Para corrigir, fale com a equipe.",
        )
    customer.birth_day, customer.birth_month, customer.birth_year = data.day, data.month, data.year
    customer.birthday_set_at = utc_now()
    await customer.save()
    return customer_service.customer_out(customer)
