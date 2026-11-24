"""Login do painel administrativo."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_admin
from app.core.rate_limit import login_limiter
from app.core.security import create_access_token, verify_password
from app.models import AdminUser
from app.schemas.auth import AdminOut, LoginIn, TokenOut

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def admin_out(admin: AdminUser) -> AdminOut:
    return AdminOut(id=str(admin.id), name=admin.name, email=admin.email, role=admin.role)


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, request: Request) -> TokenOut:
    login_limiter.check(request)
    admin = await AdminUser.find_one({"email": data.email.lower()})
    # Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem).
    if admin is None or not admin.active or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")
    token, expires_in = create_access_token(str(admin.id))
    return TokenOut(access_token=token, expires_in=expires_in, admin=admin_out(admin))


@router.get("/me", response_model=AdminOut)
async def me(admin: AdminUser = Depends(get_current_admin)) -> AdminOut:
    return admin_out(admin)
