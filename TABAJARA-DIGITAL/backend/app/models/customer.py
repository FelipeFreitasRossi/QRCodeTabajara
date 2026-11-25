"""Cliente do Tabajara (cadastro central, usado pelo Clube e, depois, por reservas e eventos).

O CPF não é guardado em texto: só o hash (para encontrar o cadastro) e o final (para exibir).
"""

from datetime import datetime

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class Customer(TimestampedDocument):
    name: str
    cpf_hash: str
    cpf_tail: str  # ex.: •••.•••.247-25
    phone: str  # só dígitos, com DDD
    email: str | None = None
    pin_hash: str

    # Consentimento (LGPD): quando aceitou e qual versão do aviso de privacidade.
    consent_at: datetime
    consent_version: str

    active: bool = True
    failed_attempts: int = 0
    locked_until: datetime | None = None
    anonymized_at: datetime | None = None
    # pratos marcados com o coração (só existem com cadastro; mais recente primeiro)
    # Aniversário (opcional). Depois de informado, só a equipe altera (evita fraude no presente).
    birth_day: int | None = None
    birth_month: int | None = None
    birth_year: int | None = None
    birthday_set_at: datetime | None = None
    # Sessões emitidas antes disso deixam de valer (PIN redefinido, exclusão de dados).
    tokens_valid_after: datetime | None = None
    favorite_product_ids: list[PydanticObjectId] = Field(default_factory=list)

    class Settings:
        name = "customers"
        indexes = [
            IndexModel([("cpf_hash", ASCENDING)], unique=True, name="uniq_customer_cpf"),
            IndexModel([("phone", ASCENDING)], name="idx_customer_phone"),
            IndexModel([("name", ASCENDING)], name="idx_customer_name"),
        ]




__all__ = ["Customer"]
