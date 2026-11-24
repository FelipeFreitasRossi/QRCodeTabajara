"""Produto do cardápio."""

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class Product(TimestampedDocument):
    name: str
    slug: str  # único dentro da categoria -> impede produtos duplicados
    category_id: PydanticObjectId
    description: str | None = None
    # Preço guardado em centavos (inteiro) para evitar erros de arredondamento.
    price_cents: int = Field(ge=0)
    image_url: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    featured: bool = False
    available: bool = True
    position: int = 0

    class Settings:
        name = "products"
        indexes = [
            IndexModel(
                [("category_id", ASCENDING), ("slug", ASCENDING)],
                unique=True,
                name="uniq_product_slug_per_category",
            ),
            IndexModel(
                [("category_id", ASCENDING), ("position", ASCENDING)],
                name="idx_product_category_position",
            ),
        ]
