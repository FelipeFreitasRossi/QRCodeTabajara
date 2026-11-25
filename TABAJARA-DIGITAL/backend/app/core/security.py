"""Senhas/PINs (bcrypt) e tokens de acesso (JWT) do painel e dos clientes do Clube."""

from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"

# Tipos de token: um token de cliente nunca abre rotas do painel, e vice-versa.
ADMIN_TOKEN = "access"
CUSTOMER_TOKEN = "customer"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# Hash de referência para gastar o mesmo tempo quando o usuário não existe (evita descobrir e-mails/CPFs pelo tempo).
_DUMMY_HASH = bcrypt.hashpw(b"tabajara-dummy", bcrypt.gensalt()).decode("utf-8")


def burn_password_time(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _create_token(subject: str, token_type: str, expires_in: int) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),  # usado para invalidar sessões antigas (troca de senha/PIN)
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM), expires_in


class TokenData(NamedTuple):
    subject: str
    issued_at: datetime


def _decode_token(token: str, token_type: str) -> TokenData | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub", "iat"]}
        )
    except jwt.PyJWTError:
        return None
    if payload.get("type") != token_type:
        return None
    subject = payload.get("sub")
    iat = payload.get("iat")
    if not isinstance(subject, str) or not isinstance(iat, int | float):
        return None
    return TokenData(subject, datetime.fromtimestamp(iat, timezone.utc))


def issued_before(data: TokenData, valid_after: datetime | None) -> bool:
    """True se o token foi emitido antes de a conta invalidar as sessões (troca de senha/PIN)."""
    if valid_after is None:
        return False
    if valid_after.tzinfo is None:
        valid_after = valid_after.replace(tzinfo=timezone.utc)
    return data.issued_at < valid_after.replace(microsecond=0)


def create_access_token(subject: str) -> tuple[str, int]:
    """Token do painel administrativo. Retorna (token, segundos até expirar)."""
    return _create_token(subject, ADMIN_TOKEN, settings.jwt_expires_minutes * 60)


def decode_access_token(token: str) -> TokenData | None:
    """Id do administrador, ou None se o token for inválido/expirado/de outro tipo."""
    return _decode_token(token, ADMIN_TOKEN)


def create_customer_token(subject: str, remember: bool = False) -> tuple[str, int]:
    """Token do cliente do Clube Tabajara.

    Padrão: vale só para a visita (algumas horas). Com "Manter conectado neste
    celular", dura mais. O servidor decide a duração; o navegador só escolhe a opção.
    """
    seconds = settings.customer_token_days * 86400 if remember else settings.customer_visit_hours * 3600
    return _create_token(subject, CUSTOMER_TOKEN, seconds)


def decode_customer_token(token: str) -> TokenData | None:
    return _decode_token(token, CUSTOMER_TOKEN)
