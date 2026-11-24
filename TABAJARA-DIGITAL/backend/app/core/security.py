"""Senhas/PINs (bcrypt) e tokens de acesso (JWT) do painel e dos clientes do Clube."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"

# Tipos de token: um token de cliente nunca abre rotas do painel, e vice-versa.
ADMIN_TOKEN = "access"
CUSTOMER_TOKEN = "customer"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _create_token(subject: str, token_type: str, expires_in: int) -> tuple[str, int]:
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM), expires_in


def _decode_token(token: str, token_type: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != token_type:
        return None
    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None


def create_access_token(subject: str) -> tuple[str, int]:
    """Token do painel administrativo. Retorna (token, segundos até expirar)."""
    return _create_token(subject, ADMIN_TOKEN, settings.jwt_expires_minutes * 60)


def decode_access_token(token: str) -> str | None:
    """Id do administrador, ou None se o token for inválido/expirado/de outro tipo."""
    return _decode_token(token, ADMIN_TOKEN)


def create_customer_token(subject: str, remember: bool = False) -> tuple[str, int]:
    """Token do cliente do Clube Tabajara.

    Padrão: vale só para a visita (algumas horas). Com "Manter conectado neste
    celular", dura mais. O servidor decide a duração; o navegador só escolhe a opção.
    """
    seconds = settings.customer_token_days * 86400 if remember else settings.customer_visit_hours * 3600
    return _create_token(subject, CUSTOMER_TOKEN, seconds)


def decode_customer_token(token: str) -> str | None:
    return _decode_token(token, CUSTOMER_TOKEN)
