"""Cadastro e login do cliente (Clube Tabajara)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import StrictModel
from app.utils.cpf import is_valid_cpf, only_digits

PRIVACY_VERSION = "2026-11"


def _phone(value: str) -> str:
    digits = only_digits(value)
    if not 10 <= len(digits) <= 11:
        raise ValueError("Informe o celular com DDD.")
    return digits


def _pin(value: str) -> str:
    if not value.isdigit() or not 4 <= len(value) <= 6:
        raise ValueError("O PIN deve ter de 4 a 6 números.")
    return value


def _new_pin(value: str) -> str:
    """PIN novo (cadastro e redefinição): além do formato, recusa sequências óbvias."""
    value = _pin(value)
    if len(set(value)) == 1 or value in "0123456789" or value in "9876543210":
        raise ValueError("Escolha um PIN menos óbvio (evite 1234, 0000…).")
    return value


class CustomerRegisterIn(StrictModel):
    name: str = Field(min_length=2, max_length=60)
    cpf: str = Field(min_length=11, max_length=14)
    phone: str = Field(min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    pin: str
    accept_privacy: Literal[True]  # o cadastro só existe com o aceite do aviso de privacidade
    remember: bool = False  # "Manter conectado neste celular"
    # Aniversário obrigatório no cadastro (dia e mês; o ano é opcional).
    birth_day: int = Field(ge=1, le=31)
    birth_month: int = Field(ge=1, le=12)
    birth_year: int | None = Field(default=None, ge=1900, le=2100)

    @model_validator(mode="after")
    def _birth(self):
        _check_birth(self.birth_day, self.birth_month, self.birth_year)
        return self

    @field_validator("cpf")
    @classmethod
    def check_cpf(cls, value: str) -> str:
        if not is_valid_cpf(value):
            raise ValueError("CPF inválido.")
        return only_digits(value)

    _check_phone = field_validator("phone")(lambda cls, v: _phone(v))
    _check_pin = field_validator("pin")(lambda cls, v: _new_pin(v))


class CustomerLoginIn(StrictModel):
    cpf: str = Field(min_length=11, max_length=14)
    pin: str = Field(min_length=4, max_length=6)
    remember: bool = False  # "Manter conectado neste celular"


class CustomerUpdateIn(StrictModel):
    name: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=254)

    _check_phone = field_validator("phone")(lambda cls, v: _phone(v))


class CustomerOut(BaseModel):
    id: str
    name: str
    cpf_tail: str
    phone: str
    email: str | None
    member_since: datetime
    birth_day: int | None = None
    birth_month: int | None = None


class CustomerSessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    customer: CustomerOut


class AdminPinResetIn(StrictModel):
    pin: str

    _check_pin = field_validator("pin")(lambda cls, v: _new_pin(v))


def _check_birth(day: int | None, month: int | None, year: int | None) -> None:
    """Dia e mês vêm juntos e precisam formar uma data real (ano opcional)."""
    if day is None and month is None:
        return
    if day is None or month is None:
        raise ValueError("Informe dia e mês do aniversário.")
    from datetime import date

    try:
        date(year or 2000, month, day)  # 2000 é bissexto: aceita 29/02 sem ano
    except ValueError:
        raise ValueError("Data de aniversário inválida.") from None
    if year is not None and year > date.today().year:
        raise ValueError("Data de aniversário inválida.")


class BirthdayIn(StrictModel):
    day: int = Field(ge=1, le=31)
    month: int = Field(ge=1, le=12)
    year: int | None = Field(default=None, ge=1900, le=2100)

    @model_validator(mode="after")
    def _valid(self):
        _check_birth(self.day, self.month, self.year)
        return self
