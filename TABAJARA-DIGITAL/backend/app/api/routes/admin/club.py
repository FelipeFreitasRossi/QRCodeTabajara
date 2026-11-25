"""Painel · Clube Tabajara: regras, clientes, ajuste de pontos e redefinição de PIN."""

import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from PIL import UnidentifiedImageError

from app.api.deps import get_current_admin, get_or_404, parse_object_id
from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models import AdminUser, Customer, LoyaltyAccount, Product, Reward
from app.models.base import utc_now
from app.schemas.club import (
    AdminAdjustIn,
    AdminCustomerOut,
    ClubSettingsIn,
    ClubSettingsOut,
    RewardAdminOut,
    RewardIn,
)
from app.schemas.customer import AdminPinResetIn, BirthdayIn
from app.services import loyalty_service, reward_service
from app.services.catalog_service import delete_uploaded_file
from app.services.media_service import save_image
from app.utils.cpf import cpf_hash, is_valid_cpf, only_digits

router = APIRouter(prefix="/club", tags=["Admin · Clube"])


def _settings_out(s) -> ClubSettingsOut:
    return ClubSettingsOut(
        enabled=s.enabled,
        points_per_real=s.points_per_real,
        min_order_cents=s.min_order_cents,
        excluded_category_ids=[str(c) for c in s.excluded_category_ids],
        credit_on_status=s.credit_on_status,
        min_reward_points=s.min_reward_points,
        birthday_enabled=s.birthday_enabled,
        birthday_product_id=str(s.birthday_product_id) if s.birthday_product_id else None,
        birthday_min_days=s.birthday_min_days,
    )


async def _customer_out(customer: Customer, account: LoyaltyAccount | None = None) -> AdminCustomerOut:
    account = account or await loyalty_service.get_account(customer.id)
    return AdminCustomerOut(
        id=str(customer.id),
        name=customer.name,
        cpf_tail=customer.cpf_tail,
        phone=customer.phone,
        email=customer.email,
        balance=account.balance,
        lifetime_earned=account.lifetime_earned,
        member_since=customer.created_at,
        locked=bool(customer.locked_until and customer.locked_until > utc_now()),
        birthday=f"{customer.birth_day:02d}/{customer.birth_month:02d}" if customer.birth_month else None,
    )


@router.get("/settings", response_model=ClubSettingsOut)
async def get_settings() -> ClubSettingsOut:
    return _settings_out(await loyalty_service.get_settings())


@router.put("/settings", response_model=ClubSettingsOut)
async def update_settings(data: ClubSettingsIn) -> ClubSettingsOut:
    current = await loyalty_service.get_settings()
    current.enabled = data.enabled
    current.points_per_real = data.points_per_real
    current.min_order_cents = data.min_order_cents
    current.excluded_category_ids = [parse_object_id(c, "Categoria não encontrada.") for c in data.excluded_category_ids]
    current.min_reward_points = data.min_reward_points
    current.birthday_min_days = data.birthday_min_days
    if data.birthday_product_id:
        product = await get_or_404(Product, data.birthday_product_id, "Prato do presente não encontrado.")
        current.birthday_product_id = product.id
    else:
        current.birthday_product_id = None
    if data.birthday_enabled and current.birthday_product_id is None:
        raise HTTPException(status_code=422, detail="Escolha o prato do presente de aniversário para ativar.")
    current.birthday_enabled = data.birthday_enabled
    await current.save()
    return _settings_out(current)


@router.get("/customers", response_model=list[AdminCustomerOut])
async def list_customers(q: str = Query(default="", max_length=60)) -> list[AdminCustomerOut]:
    """Busca por nome, celular ou CPF completo (o CPF é comparado pelo hash)."""
    term = q.strip()
    query: dict = {"active": True}
    digits = only_digits(term)
    if term and len(digits) == 11 and is_valid_cpf(digits):
        query["cpf_hash"] = cpf_hash(digits)
    elif term and len(digits) >= 4 and len(digits) == len(re.sub(r"[\s().-]", "", term)):
        query["phone"] = {"$regex": re.escape(digits)}
    elif term:
        query["name"] = {"$regex": re.escape(term), "$options": "i"}
    customers = await Customer.find(query).sort("-created_at").limit(100).to_list()
    accounts = {
        a.customer_id: a
        for a in await LoyaltyAccount.find({"customer_id": {"$in": [c.id for c in customers]}}).to_list()
    }
    return [await _customer_out(c, accounts.get(c.id)) for c in customers]


@router.post("/customers/{customer_id}/points", response_model=AdminCustomerOut)
async def adjust_points(
    customer_id: str, data: AdminAdjustIn, admin: AdminUser = Depends(get_current_admin)
) -> AdminCustomerOut:
    """Lançamento manual (ex.: compra no balcão, com número da comanda no motivo)."""
    customer = await get_or_404(Customer, customer_id, "Cliente não encontrado.")
    account = await loyalty_service.adjust(customer.id, data.points, data.reason, admin.id)
    return await _customer_out(customer, account)


@router.post("/customers/{customer_id}/pin", response_model=AdminCustomerOut)
async def reset_pin(customer_id: str, data: AdminPinResetIn) -> AdminCustomerOut:
    """Equipe define um PIN novo depois de conferir o documento do cliente no balcão."""
    customer = await get_or_404(Customer, customer_id, "Cliente não encontrado.")
    customer.pin_hash = hash_password(data.pin)
    customer.failed_attempts = 0
    customer.locked_until = None
    customer.tokens_valid_after = utc_now()  # quem estava logado com o PIN antigo precisa entrar de novo
    await customer.save()
    return await _customer_out(customer)


@router.post("/customers/{customer_id}/anonymize", status_code=204)
async def anonymize_customer(customer_id: str) -> Response:
    """Pedido de exclusão (LGPD): apaga os dados pessoais e desativa o cadastro.

    O extrato de pontos continua existindo, sem identificar a pessoa. Irreversível:
    o painel pede confirmação digitando o nome antes de chamar esta rota.
    """
    customer = await get_or_404(Customer, customer_id, "Cliente não encontrado.")
    if customer.anonymized_at is None:
        customer.name = "Cliente removido"
        customer.cpf_hash = f"anon:{customer.id}"
        customer.cpf_tail = "•••.•••.•••-••"
        customer.phone = ""
        customer.email = None
        customer.favorite_product_ids = []
        customer.pin_hash = hash_password(secrets.token_urlsafe(24))
        customer.active = False
        customer.anonymized_at = utc_now()
        customer.tokens_valid_after = utc_now()
        await customer.save()
    return Response(status_code=204)



@router.post("/customers/{customer_id}/birthday", response_model=AdminCustomerOut)
async def set_customer_birthday(customer_id: str, data: BirthdayIn) -> AdminCustomerOut:
    """Correção feita pela equipe (conferindo documento). Libera o presente na hora."""
    customer = await get_or_404(Customer, customer_id, "Cliente não encontrado.")
    customer.birth_day, customer.birth_month, customer.birth_year = data.day, data.month, data.year
    customer.birthday_set_at = utc_now() - timedelta(days=365)  # conferido pela equipe: sem carência
    await customer.save()
    return await _customer_out(customer)


# ---------------------------------------------------------------------------
# Recompensas
# ---------------------------------------------------------------------------

REWARD_NOT_FOUND = "Recompensa não encontrada."
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def _reward_admin_out(reward: Reward) -> RewardAdminOut:
    products = await reward_service._products_for([reward])
    return reward_service.reward_admin_out(reward, products)


async def _apply_reward(reward: Reward, data: RewardIn) -> None:
    settings = await loyalty_service.get_settings()
    if data.points_cost < settings.min_reward_points:
        raise HTTPException(
            status_code=422,
            detail=f"As recompensas começam em {settings.min_reward_points:,} pontos (ajuste em Regras).".replace(",", "."),
        )
    reward.name = data.name
    reward.description = (data.description or "").strip() or None
    reward.points_cost = data.points_cost
    reward.active = data.active
    reward.stock = data.stock
    reward.position = data.position
    if data.product_id:
        product = await get_or_404(Product, data.product_id, "Prato do cardápio não encontrado.")
        reward.product_id = product.id
    else:
        reward.product_id = None


@router.get("/rewards", response_model=list[RewardAdminOut])
async def list_rewards() -> list[RewardAdminOut]:
    rewards = await Reward.find_all().sort([("position", 1), ("points_cost", 1)]).to_list()
    products = await reward_service._products_for(rewards)
    return [reward_service.reward_admin_out(r, products) for r in rewards]


@router.post("/rewards", response_model=RewardAdminOut, status_code=201)
async def create_reward(data: RewardIn) -> RewardAdminOut:
    reward = Reward(name=data.name, points_cost=data.points_cost)
    await _apply_reward(reward, data)
    await reward.insert()
    return await _reward_admin_out(reward)


@router.put("/rewards/{reward_id}", response_model=RewardAdminOut)
async def update_reward(reward_id: str, data: RewardIn) -> RewardAdminOut:
    reward = await get_or_404(Reward, reward_id, REWARD_NOT_FOUND)
    await _apply_reward(reward, data)
    await reward.save()
    return await _reward_admin_out(reward)


@router.delete("/rewards/{reward_id}", status_code=204)
async def delete_reward(reward_id: str) -> Response:
    """Remove do catálogo. Pedidos antigos continuam com o nome do resgate."""
    reward = await get_or_404(Reward, reward_id, REWARD_NOT_FOUND)
    await delete_uploaded_file(reward.image_url)
    await reward.delete()
    return Response(status_code=204)


@router.post("/rewards/{reward_id}/image", response_model=RewardAdminOut)
async def upload_reward_image(reward_id: str, file: UploadFile = File(...)) -> RewardAdminOut:
    """Foto própria da recompensa (opcional: sem ela, usa a foto do prato vinculado)."""
    reward = await get_or_404(Reward, reward_id, REWARD_NOT_FOUND)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Envie uma imagem JPG, PNG ou WebP.")
    max_bytes = app_settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"A imagem deve ter no máximo {app_settings.max_upload_mb} MB.")
    filename = f"recompensa-{reward.id}-{secrets.token_hex(4)}.webp"
    try:
        await save_image(data, "recompensas", filename)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Não foi possível ler a imagem. Tente outro arquivo.") from None
    await delete_uploaded_file(reward.image_url)
    reward.image_url = f"/uploads/recompensas/{filename}"
    await reward.save()
    return await _reward_admin_out(reward)


@router.delete("/rewards/{reward_id}/image", response_model=RewardAdminOut)
async def remove_reward_image(reward_id: str) -> RewardAdminOut:
    reward = await get_or_404(Reward, reward_id, REWARD_NOT_FOUND)
    await delete_uploaded_file(reward.image_url)
    reward.image_url = None
    await reward.save()
    return await _reward_admin_out(reward)
