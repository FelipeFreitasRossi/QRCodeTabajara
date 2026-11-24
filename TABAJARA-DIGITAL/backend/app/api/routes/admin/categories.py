import secrets

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from PIL import UnidentifiedImageError
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_or_404, parse_object_id
from app.core.config import settings
from app.models import Category, Product
from app.schemas.catalog import CategoryIn, CategoryOut
from app.schemas.common import ReorderIn
from app.services.catalog_service import (
    category_out,
    delete_uploaded_file,
    next_category_position,
    uploads_path,
)
from app.services.image_service import optimize_to_webp
from app.utils.text import slugify

router = APIRouter(prefix="/categories", tags=["Admin · Categorias"])

NOT_FOUND = "Categoria não encontrada."
DUPLICATE = "Já existe uma categoria com esse nome."


@router.get("", response_model=list[CategoryOut])
async def list_categories() -> list[CategoryOut]:
    categories = await Category.find_all().sort("+position", "+name").to_list()
    rows = await Product.aggregate([{"$group": {"_id": "$category_id", "total": {"$sum": 1}}}]).to_list()
    counts = {str(row["_id"]): row["total"] for row in rows}
    return [await category_out(c, counts.get(str(c.id), 0)) for c in categories]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryIn) -> CategoryOut:
    slug = slugify(data.name)
    if not slug:
        raise HTTPException(status_code=422, detail="Informe um nome válido.")
    if await Category.find_one({"slug": slug}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
    category = Category(
        name=data.name,
        slug=slug,
        description=data.description or None,
        position=await next_category_position(),
    )
    try:
        await category.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    return await category_out(category, 0)


@router.put("/order", response_model=list[CategoryOut])
async def reorder_categories(data: ReorderIn) -> list[CategoryOut]:
    for position, category_id in enumerate(data.ids):
        category = await Category.get(parse_object_id(category_id, NOT_FOUND))
        if category and category.position != position:
            category.position = position
            await category.save()
    return await list_categories()


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(category_id: str, data: CategoryIn) -> CategoryOut:
    category = await get_or_404(Category, category_id, NOT_FOUND)
    slug = slugify(data.name)
    other = await Category.find_one({"slug": slug})
    if other and other.id != category.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
    category.name = data.name
    category.slug = slug
    category.description = data.description or None
    try:
        await category.save()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    return await category_out(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str) -> Response:
    category = await get_or_404(Category, category_id, NOT_FOUND)
    if await Product.find({"category_id": category.id}).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta categoria tem produtos. Exclua ou mova os produtos antes de excluí-la.",
        )
    delete_uploaded_file(category.image_url)
    await category.delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/{category_id}/image", response_model=CategoryOut)
async def upload_category_image(category_id: str, file: UploadFile = File(...)) -> CategoryOut:
    """Foto da seção no cardápio (aparece no canto, com degradê). """
    category = await get_or_404(Category, category_id, NOT_FOUND)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Envie uma imagem JPG, PNG ou WebP.")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"A imagem deve ter no máximo {settings.max_upload_mb} MB.")
    filename = f"{category.slug}-{secrets.token_hex(4)}.webp"
    try:
        optimize_to_webp(data, uploads_path("categorias", filename), max_size=(1400, 1400))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Não foi possível ler a imagem. Tente outro arquivo.") from None
    delete_uploaded_file(category.image_url)
    category.image_url = f"/uploads/categorias/{filename}"
    await category.save()
    return await category_out(category)


@router.delete("/{category_id}/image", response_model=CategoryOut)
async def remove_category_image(category_id: str) -> CategoryOut:
    category = await get_or_404(Category, category_id, NOT_FOUND)
    delete_uploaded_file(category.image_url)
    category.image_url = None
    await category.save()
    return await category_out(category)
