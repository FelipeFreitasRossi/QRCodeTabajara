import secrets

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status
from PIL import UnidentifiedImageError
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_or_404, parse_object_id
from app.core.config import settings
from app.models import Category, Product
from app.schemas.catalog import ProductIn, ProductOut, ProductPatch, ProductReorderIn
from app.services.catalog_service import (
    delete_uploaded_file,
    next_product_position,
    product_out,
)
from app.services.media_service import save_image
from app.utils.text import slugify

router = APIRouter(prefix="/products", tags=["Admin · Produtos"])

NOT_FOUND = "Produto não encontrado."
DUPLICATE = "Já existe um produto com esse nome nesta categoria."
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def _ensure_unique(category_id, slug: str, ignore_id=None) -> None:
    other = await Product.find_one({"category_id": category_id, "slug": slug})
    if other and other.id != ignore_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)


@router.get("", response_model=list[ProductOut])
async def list_products(category_id: str | None = Query(default=None)) -> list[ProductOut]:
    query = {"category_id": parse_object_id(category_id)} if category_id else {}
    products = await Product.find(query).sort("+position", "+name").to_list()
    return [product_out(p) for p in products]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductIn) -> ProductOut:
    category = await get_or_404(Category, data.category_id, "Categoria não encontrada.")
    slug = slugify(data.name)
    await _ensure_unique(category.id, slug)
    product = Product(
        name=data.name,
        slug=slug,
        category_id=category.id,
        description=data.description or None,
        price_cents=data.price_cents,
        ingredients=data.ingredients,
        allergens=data.allergens,
        featured=data.featured,
        available=data.available,
        position=await next_product_position(category.id),
    )
    try:
        await product.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    return product_out(product)


@router.put("/order", response_model=list[ProductOut])
async def reorder_products(data: ProductReorderIn) -> list[ProductOut]:
    category_id = parse_object_id(data.category_id, "Categoria não encontrada.")
    for position, product_id in enumerate(data.ids):
        product = await Product.get(parse_object_id(product_id, NOT_FOUND))
        if product and product.category_id == category_id and product.position != position:
            product.position = position
            await product.save()
    return await list_products(data.category_id)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str) -> ProductOut:
    return product_out(await get_or_404(Product, product_id, NOT_FOUND))


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, data: ProductIn) -> ProductOut:
    product = await get_or_404(Product, product_id, NOT_FOUND)
    category = await get_or_404(Category, data.category_id, "Categoria não encontrada.")
    slug = slugify(data.name)
    await _ensure_unique(category.id, slug, ignore_id=product.id)

    if category.id != product.category_id:
        product.position = await next_product_position(category.id)
    product.name = data.name
    product.slug = slug
    product.category_id = category.id
    product.description = data.description or None
    product.price_cents = data.price_cents
    product.ingredients = data.ingredients
    product.allergens = data.allergens
    product.featured = data.featured
    product.available = data.available
    try:
        await product.save()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    return product_out(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def patch_product(product_id: str, data: ProductPatch) -> ProductOut:
    product = await get_or_404(Product, product_id, NOT_FOUND)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await product.save()
    return product_out(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str) -> Response:
    product = await get_or_404(Product, product_id, NOT_FOUND)
    await delete_uploaded_file(product.image_url)
    await product.delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{product_id}/image", response_model=ProductOut)
async def upload_image(product_id: str, file: UploadFile = File(...)) -> ProductOut:
    """Recebe a foto, valida, otimiza (WebP, até 1200 px) e substitui a anterior."""
    product = await get_or_404(Product, product_id, NOT_FOUND)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Envie uma imagem JPG, PNG ou WebP.")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"A imagem deve ter no máximo {settings.max_upload_mb} MB.")

    # Nome novo a cada envio: o navegador do cliente nunca mostra a foto antiga em cache.
    filename = f"{product.slug}-{secrets.token_hex(4)}.webp"
    try:
        await save_image(data, "produtos", filename)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Não foi possível ler a imagem. Tente outro arquivo.") from None

    await delete_uploaded_file(product.image_url)
    product.image_url = f"/uploads/produtos/{filename}"
    await product.save()
    return product_out(product)


@router.delete("/{product_id}/image", response_model=ProductOut)
async def remove_image(product_id: str) -> ProductOut:
    product = await get_or_404(Product, product_id, NOT_FOUND)
    await delete_uploaded_file(product.image_url)
    product.image_url = None
    await product.save()
    return product_out(product)
