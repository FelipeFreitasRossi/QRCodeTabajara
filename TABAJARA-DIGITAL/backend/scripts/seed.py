"""Popula o banco com um cardápio de EXEMPLO, com fotos ilustrativas.

Uso (dentro de backend/, com o .venv ativo):
    python -m scripts.seed

Pode ser executado várias vezes: atualiza o que já existe em vez de duplicar,
e só baixa as fotos que ainda não estão na pasta uploads/.
"""

import asyncio
import secrets
import urllib.request
from pathlib import Path

from app.core.config import settings
from app.db.mongodb import connect_to_mongo
from app.services import media_service
from app.models import Category, DiningTable, Product
from app.services.image_service import optimize_to_webp
from app.utils.text import slugify
from scripts.seed_data import CATEGORIES, CATEGORY_PHOTOS, HERO_PHOTO, TABLE_COUNT

PEXELS_URL = "https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=1600"
USER_AGENT = "Mozilla/5.0 (TabajaraDigital seed)"


def download_photo(photo_id: int, destination: Path, max_size: tuple[int, int] = (1200, 1200)) -> bool:
    """Baixa a foto do Pexels e salva otimizada em WebP. Retorna False se falhar."""
    if destination.exists():
        return True
    request = urllib.request.Request(PEXELS_URL.format(id=photo_id), headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            optimize_to_webp(response.read(), destination, max_size)
        return True
    except Exception as error:  # sem internet, foto removida etc.: segue sem a foto
        print(f"    ! Não foi possível baixar a foto {photo_id}: {error}")
        return False


async def seed_tables() -> None:
    for number in range(1, TABLE_COUNT + 1):
        slug = DiningTable.slug_for(number)
        if await DiningTable.find_one({"slug": slug}) is None:
            await DiningTable(number=number, slug=slug, qr_token=secrets.token_urlsafe(9)).insert()


def seed_hero() -> None:
    destination = settings.uploads_dir / "site" / "capa.webp"
    if download_photo(HERO_PHOTO, destination, max_size=(2000, 2000)):
        print("  Foto de capa: ok")


def category_photo(category: Category) -> bool:
    """Baixa a foto de exemplo da seção, só se ela ainda não tiver foto (não sobrescreve a do painel)."""
    photo_id = CATEGORY_PHOTOS.get(category.slug)
    if category.image_url or not photo_id:
        return False
    filename = f"{category.slug}.webp"
    if download_photo(photo_id, settings.uploads_dir / "categorias" / filename, max_size=(1400, 1400)):
        category.image_url = f"/uploads/categorias/{filename}"
        return True
    return False


async def seed_menu() -> None:
    photos_dir = settings.uploads_dir / "produtos"

    for cat_position, cat_data in enumerate(CATEGORIES):
        category = await Category.find_one({"slug": cat_data["slug"]})
        if category is None:
            category = Category(name=cat_data["name"], slug=cat_data["slug"])
        category.description = cat_data.get("description")
        category.position = cat_position
        category_photo(category)
        await category.save()

        with_photo = 0
        for prod_position, prod_data in enumerate(cat_data["products"]):
            slug = slugify(prod_data["name"])
            product = await Product.find_one({"category_id": category.id, "slug": slug})
            if product is None:
                product = Product(
                    name=prod_data["name"],
                    slug=slug,
                    category_id=category.id,
                    price_cents=prod_data["price_cents"],
                )
            product.description = prod_data.get("description")
            product.price_cents = prod_data["price_cents"]
            product.ingredients = prod_data.get("ingredients", [])
            product.allergens = prod_data.get("allergens", [])
            product.featured = prod_data.get("featured", False)
            product.available = prod_data.get("available", True)
            product.position = prod_position

            photo_id = prod_data.get("photo")
            if photo_id and download_photo(photo_id, photos_dir / f"{slug}.webp"):
                product.image_url = f"/uploads/produtos/{slug}.webp"
                with_photo += 1

            await product.save()

        print(f"  {category.name}: {len(cat_data['products'])} produtos ({with_photo} com foto)")


async def main() -> None:
    client = await connect_to_mongo()
    try:
        print("Populando o banco com dados de exemplo (as fotos podem levar alguns segundos)...")
        await seed_tables()
        print(f"  Mesas: 1 a {TABLE_COUNT}")
        seed_hero()
        await seed_menu()
        sent = await media_service.sync_folder()
        print(f"  Fotos copiadas para o banco: {sent}")
        print("Pronto.")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
