"""Login do painel administrativo."""

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_admin
from app.core.rate_limit import login_limiter
from app.core.security import burn_password_time, create_access_token, verify_password
from app.models import AdminUser
from app.models.base import utc_now
from app.schemas.auth import AdminOut, LoginIn, TokenOut

router = APIRouter(prefix="/auth", tags=["Autenticação"])
logger = logging.getLogger("tabajara.auth")

ADMIN_MAX_ATTEMPTS = 8
ADMIN_LOCK_MINUTES = 15


def admin_out(admin: AdminUser) -> AdminOut:
    return AdminOut(id=str(admin.id), name=admin.name, email=admin.email, role=admin.role)


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, request: Request) -> TokenOut:
    login_limiter.check(request)
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")
    admin = await AdminUser.find_one({"email": data.email.lower()})
    # Mesma mensagem e mesmo tempo de resposta para e-mail inexistente e senha errada.
    if admin is None or not admin.active:
        burn_password_time(data.password)
        raise invalid
    now = utc_now()
    if admin.locked_until and admin.locked_until.replace(tzinfo=now.tzinfo) > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Conta bloqueada por tentativas erradas. Tente de novo em {ADMIN_LOCK_MINUTES} minutos.",
        )
    if not verify_password(data.password, admin.password_hash):
        admin.failed_attempts += 1
        if admin.failed_attempts >= ADMIN_MAX_ATTEMPTS:
            admin.failed_attempts = 0
            admin.locked_until = now + timedelta(minutes=ADMIN_LOCK_MINUTES)
            logger.warning("Painel: conta %s bloqueada após tentativas erradas de senha", admin.email)
        await admin.save()
        raise invalid
    if admin.failed_attempts or admin.locked_until:
        admin.failed_attempts = 0
        admin.locked_until = None
        await admin.save()
    token, expires_in = create_access_token(str(admin.id))
    return TokenOut(access_token=token, expires_in=expires_in, admin=admin_out(admin))


@router.get("/me", response_model=AdminOut)
async def me(admin: AdminUser = Depends(get_current_admin)) -> AdminOut:
    return admin_out(admin)
