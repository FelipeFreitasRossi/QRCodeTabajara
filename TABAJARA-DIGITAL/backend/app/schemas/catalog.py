"""Dados de categorias, produtos e mesas usados pelo painel administrativo."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import StrictModel


def _clean_list(values: list[str]) -> list[str]:
    """Remove itens vazios e repetidos, mantendo a ordem."""
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = value.strip()
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            result.append(item)
    return result


# ---------- Categorias ----------

class CategoryIn(StrictModel):
    name: str = Field(min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=200)


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    position: int
    product_count: int
    image_url: str | None = None


# ---------- Produtos ----------

class ProductIn(StrictModel):
    name: str = Field(min_length=2, max_length=80)
    category_id: str
    description: str | None = Field(default=None, max_length=400)
    price_cents: int = Field(ge=0, le=10_000_000)
    ingredients: list[str] = Field(default_factory=list, max_length=40)
    allergens: list[str] = Field(default_factory=list, max_length=20)
    featured: bool = False
    available: bool = True

    @field_validator("ingredients", "allergens")
    @classmethod
    def clean(cls, values: list[str]) -> list[str]:
        cleaned = _clean_list(values)
        if any(len(item) > 60 for item in cleaned):
            raise ValueError("Cada item deve ter no máximo 60 caracteres.")
        return cleaned


class ProductPatch(StrictModel):
    """Alterações rápidas pela lista (sem abrir o formulário)."""

    available: bool | None = None
    featured: bool | None = None
    price_cents: int | None = Field(default=None, ge=0, le=10_000_000)


class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    category_id: str
    description: str | None
    price_cents: int
    image_url: str | None
    ingredients: list[str]
    allergens: list[str]
    featured: bool
    available: bool
    position: int
    updated_at: datetime


class ProductReorderIn(StrictModel):
    category_id: str
    ids: list[str]


# ---------- Mesas ----------

class TableIn(StrictModel):
    number: int = Field(ge=1, le=999)
    label: str | None = Field(default=None, max_length=40)
    active: bool = True
    seats: int = Field(default=4, ge=1, le=50)


class TableOut(BaseModel):
    id: str
    number: int
    slug: str
    label: str | None
    active: bool
    seats: int
    qr_url: str | None  # endereço que vai dentro do QR Code
    call_url: str | None = None  # QR de chamar atendente
