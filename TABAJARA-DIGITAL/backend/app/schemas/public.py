"""Formatos de resposta da API pública (o que o cliente vê no cardápio).

Ficam separados dos modelos do banco para nunca expor campos internos.
"""

from pydantic import BaseModel


class PublicProduct(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    price_cents: int
    image_url: str | None = None
    ingredients: list[str]
    allergens: list[str]
    featured: bool
    available: bool


class PublicCategory(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None  # foto da seção
    products: list[PublicProduct]


class PublicMenu(BaseModel):
    categories: list[PublicCategory]
