"""Conversões e regras de categorias, produtos e mesas para o painel."""

import secrets
from pathlib import Path

from app.core.config import settings
from app.models import Category, DiningTable, Product
from app.schemas.catalog import CategoryOut, ProductOut, TableOut
from app.services.media_service import delete_uploaded_file

__all__ = ["delete_uploaded_file"]  # mantido aqui para as rotas que já importam daqui


async def category_out(category: Category, product_count: int | None = None) -> CategoryOut:
    if product_count is None:
        product_count = await Product.find({"category_id": category.id}).count()
    return CategoryOut(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        description=category.description,
        position=category.position,
        product_count=product_count,
        image_url=category.image_url,
    )


def product_out(product: Product) -> ProductOut:
    return ProductOut(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        category_id=str(product.category_id),
        description=product.description,
        price_cents=product.price_cents,
        image_url=product.image_url,
        ingredients=product.ingredients,
        allergens=product.allergens,
        featured=product.featured,
        available=product.available,
        position=product.position,
        updated_at=product.updated_at,
    )


def table_out(table: DiningTable) -> TableOut:
    return TableOut(
        id=str(table.id),
        number=table.number,
        slug=table.slug,
        label=table.label,
        active=table.active,
        seats=table.seats,
        qr_url=table_qr_url(table),
    )


def new_qr_token() -> str:
    return secrets.token_urlsafe(9)


def table_qr_url(table: DiningTable) -> str | None:
    if not table.qr_token:
        return None
    return f"{settings.public_site_url.rstrip('/')}/m/{table.qr_token}"


async def next_product_position(category_id) -> int:
    last = await Product.find({"category_id": category_id}).sort("-position").first_or_none()
    return (last.position + 1) if last else 0


async def next_category_position() -> int:
    last = await Category.find_all().sort("-position").first_or_none()
    return (last.position + 1) if last else 0


def uploads_path(*parts: str) -> Path:
    return settings.uploads_dir.joinpath(*parts)
