"""Equipe (só o gerente): cadastrar garçons e gerentes, trocar senha e desativar.

Ninguém é apagado: quem sai da casa fica desativado, para manter o histórico de
quem atendeu chamados, fechou contas e cancelou pedidos.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import ROLE_ADMIN, get_or_404, require_admin
from app.core.security import hash_password
from app.models import AdminUser
from app.models.base import utc_now
from app.schemas.staff import StaffCreateIn, StaffOut, StaffPasswordIn, StaffUpdateIn

router = APIRouter(prefix="/equipe", tags=["Admin · Equipe"])
logger = logging.getLogger("tabajara.staff")

NOT_FOUND = "Pessoa da equipe não encontrada."
DUPLICATE = "Já existe alguém da equipe com esse e-mail."


def staff_out(user: AdminUser, me: AdminUser) -> StaffOut:
    now = utc_now()
    locked = bool(user.locked_until and user.locked_until.replace(tzinfo=now.tzinfo) > now)
    return StaffOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        active=user.active,
        locked=locked,
        is_me=user.id == me.id,
        created_at=user.created_at,
    )


async def _other_active_admins(user: AdminUser) -> int:
    return await AdminUser.find({"role": ROLE_ADMIN, "active": True, "_id": {"$ne": user.id}}).count()


@router.get("", response_model=list[StaffOut])
async def list_staff(me: AdminUser = Depends(require_admin)) -> list[StaffOut]:
    users = await AdminUser.find_all().to_list()
    # Ativos primeiro, gerentes antes de garçons, depois por nome.
    users.sort(key=lambda u: (not u.active, u.role != ROLE_ADMIN, u.name.lower()))
    return [staff_out(u, me) for u in users]


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(data: StaffCreateIn, me: AdminUser = Depends(require_admin)) -> StaffOut:
    if await AdminUser.find_one({"email": data.email}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
    user = AdminUser(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        created_by=str(me.id),
    )
    try:
        await user.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    logger.info("Equipe: %s cadastrou %s (%s)", me.email, user.email, user.role)
    return staff_out(user, me)


@router.patch("/{user_id}", response_model=StaffOut)
async def update_staff(user_id: str, data: StaffUpdateIn, me: AdminUser = Depends(require_admin)) -> StaffOut:
    user = await get_or_404(AdminUser, user_id, NOT_FOUND)
    is_me = user.id == me.id
    losing_admin = user.role == ROLE_ADMIN and user.active and (
        (data.role is not None and data.role != ROLE_ADMIN) or data.active is False
    )
    if is_me and losing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode tirar o seu próprio acesso de gerente. Peça a outro gerente.",
        )
    if losing_admin and await _other_active_admins(user) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A casa precisa de pelo menos um gerente ativo.",
        )

    if data.email is not None and data.email != user.email:
        if await AdminUser.find_one({"email": data.email, "_id": {"$ne": user.id}}):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
        user.email = data.email
    if data.name is not None:
        user.name = data.name
    if data.role is not None:
        user.role = data.role
    if data.active is not None and data.active != user.active:
        user.active = data.active
        if not data.active:
            user.tokens_valid_after = utc_now()  # derruba o login no celular dele na hora
    try:
        await user.save()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    logger.info("Equipe: %s alterou %s (perfil=%s, ativo=%s)", me.email, user.email, user.role, user.active)
    return staff_out(user, me)


@router.post("/{user_id}/senha", response_model=StaffOut)
async def reset_password(user_id: str, data: StaffPasswordIn, me: AdminUser = Depends(require_admin)) -> StaffOut:
    """Nova senha (ex.: o garçom esqueceu). Encerra os logins abertos com a senha antiga."""
    user = await get_or_404(AdminUser, user_id, NOT_FOUND)
    user.password_hash = hash_password(data.password)
    user.failed_attempts = 0
    user.locked_until = None
    if user.id != me.id:
        user.tokens_valid_after = utc_now()
    await user.save()
    logger.info("Equipe: %s trocou a senha de %s", me.email, user.email)
    return staff_out(user, me)
