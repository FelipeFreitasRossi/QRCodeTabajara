"""Equipe do painel: gerentes e garçons, cada um com o próprio login."""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import StrictModel

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
StaffRole = Literal["admin", "garcom"]


def _clean_email(value: str) -> str:
    value = value.strip().lower()
    if not EMAIL_RE.match(value):
        raise ValueError("E-mail inválido.")
    return value


def _clean_name(value: str) -> str:
    value = " ".join(value.split())
    if len(value) < 2:
        raise ValueError("Informe o nome.")
    return value


class StaffCreateIn(StrictModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    role: StaffRole = "garcom"

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return _clean_name(value)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        return _clean_email(value)


class StaffUpdateIn(StrictModel):
    """Só os campos enviados mudam."""

    name: str | None = Field(default=None, min_length=2, max_length=80)
    email: str | None = Field(default=None, min_length=5, max_length=254)
    role: StaffRole | None = None
    active: bool | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else _clean_name(value)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str | None) -> str | None:
        return None if value is None else _clean_email(value)


class StaffPasswordIn(StrictModel):
    password: str = Field(min_length=10, max_length=128)


class StaffOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    active: bool
    locked: bool
    is_me: bool
    created_at: datetime
