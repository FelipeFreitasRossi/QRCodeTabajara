"""Categoria do cardápio (Entradas, Cortes, Bebidas...). Cadastrada pelo painel."""

from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class Category(TimestampedDocument):
    name: str
    slug: str  # gerado a partir do nome; único -> impede categorias duplicadas
    description: str | None = None
    position: int = 0  # ordem de exibição
    # Foto da seção no cardápio Sem foto, a seção aparece sem imagem.
    image_url: str | None = None

    class Settings:
        name = "categories"
        indexes = [
            IndexModel([("slug", ASCENDING)], unique=True, name="uniq_category_slug"),
            IndexModel([("position", ASCENDING)], name="idx_category_position"),
        ]
