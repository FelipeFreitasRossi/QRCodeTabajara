"""Regras do cardápio público."""

from app.models import Category, Product
from app.schemas.public import PublicCategory, PublicMenu, PublicProduct


def to_public_product(product: Product) -> PublicProduct:
    return PublicProduct(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        description=product.description,
        price_cents=product.price_cents,
        image_url=product.image_url,
        ingredients=product.ingredients,
        allergens=product.allergens,
        featured=product.featured,
        available=product.available,
    )


async def build_public_menu() -> PublicMenu:
    categories = await Category.find_all().sort("+position", "+name").to_list()
    category_ids = [c.id for c in categories]

    products = (
        await Product.find({"category_id": {"$in": category_ids}})
        .sort("+position", "+name")
        .to_list()
    )

    by_category: dict[str, list[PublicProduct]] = {str(cid): [] for cid in category_ids}
    for product in products:
        by_category[str(product.category_id)].append(to_public_product(product))

    public_categories = [
        PublicCategory(
            id=str(category.id),
            name=category.name,
            slug=category.slug,
            description=category.description,
            image_url=category.image_url,
            products=by_category[str(category.id)],
        )
        for category in categories
        if by_category[str(category.id)]  # categorias vazias não aparecem para o cliente
    ]

    return PublicMenu(categories=public_categories)
