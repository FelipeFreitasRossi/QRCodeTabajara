"""Cadastro e autenticação do cliente do Clube (CPF + PIN)."""

from datetime import timedelta

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.security import (
    burn_password_time,
    create_customer_token,
    hash_password,
    verify_password,
)
from app.models import Customer
from app.models.base import utc_now
from app.schemas.customer import (
    PRIVACY_VERSION,
    CustomerOut,
    CustomerRegisterIn,
    CustomerSessionOut,
)
from app.services import loyalty_service
from app.utils.cpf import cpf_hash, cpf_tail, is_valid_cpf

MAX_PIN_ATTEMPTS = 5
LOCK_MINUTES = 15
INVALID_LOGIN = "CPF ou PIN incorretos."


def customer_out(customer: Customer) -> CustomerOut:
    return CustomerOut(
        id=str(customer.id),
        name=customer.name,
        cpf_tail=customer.cpf_tail,
        phone=customer.phone,
        email=customer.email,
        member_since=customer.created_at,
        birth_day=customer.birth_day,
        birth_month=customer.birth_month,
    )


def session_out(customer: Customer, remember: bool = False) -> CustomerSessionOut:
    token, expires_in = create_customer_token(str(customer.id), remember)
    return CustomerSessionOut(access_token=token, expires_in=expires_in, customer=customer_out(customer))


async def register(data: CustomerRegisterIn) -> Customer:
    key = cpf_hash(data.cpf)
    if await Customer.find_one({"cpf_hash": key}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este CPF já tem cadastro no Clube. Entre com o seu PIN.",
        )
    customer = Customer(
        name=data.name,
        cpf_hash=key,
        cpf_tail=cpf_tail(data.cpf),
        phone=data.phone,
        email=(data.email or "").strip().lower() or None,
        pin_hash=hash_password(data.pin),
        consent_at=utc_now(),
        consent_version=PRIVACY_VERSION,
        birth_day=data.birth_day,
        birth_month=data.birth_month,
        birth_year=data.birth_year,
        birthday_set_at=utc_now() if data.birth_month else None,
    )
    try:
        await customer.insert()
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este CPF já tem cadastro no Clube. Entre com o seu PIN.",
        ) from None
    await loyalty_service.get_account(customer.id)
    return customer


async def authenticate(cpf: str, pin: str) -> Customer:
    """Confere CPF + PIN. Mensagem sempre igual para não revelar se o CPF existe."""
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_LOGIN)
    if not is_valid_cpf(cpf) or not pin.isdigit():
        raise invalid

    customer = await Customer.find_one({"cpf_hash": cpf_hash(cpf), "active": True})
    if customer is None:
        burn_password_time(pin)  # mesmo tempo de resposta de um CPF existente
        raise invalid

    now = utc_now()
    if customer.locked_until and customer.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas. Tente novamente em {LOCK_MINUTES} minutos ou peça ajuda à equipe.",
        )

    if not verify_password(pin, customer.pin_hash):
        customer.failed_attempts += 1
        if customer.failed_attempts >= MAX_PIN_ATTEMPTS:
            customer.failed_attempts = 0
            customer.locked_until = now + timedelta(minutes=LOCK_MINUTES)
        await customer.save()
        raise invalid

    if customer.failed_attempts or customer.locked_until:
        customer.failed_attempts = 0
        customer.locked_until = None
        await customer.save()
    return customer
