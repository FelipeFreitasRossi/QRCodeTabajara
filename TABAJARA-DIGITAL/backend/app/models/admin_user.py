"""Usuário do painel (gerente ou garçom).

O primeiro gerente é criado com: python -m scripts.create_admin
Os garçons são cadastrados pelo gerente no painel, em Equipe.
"""

from datetime import datetime

from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class AdminUser(TimestampedDocument):
    name: str
    email: str  # sempre em minúsculas
    password_hash: str
    role: str = "admin"  # "admin" (gerente) ou "garcom"; veja app/api/deps.py
    created_by: str | None = None  # id de quem cadastrou (vazio para quem veio do create_admin)
    active: bool = True
    # Bloqueio após erros de senha e invalidação de sessões ao trocar a senha.
    failed_attempts: int = 0
    locked_until: datetime | None = None
    tokens_valid_after: datetime | None = None

    class Settings:
        name = "admin_users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True, name="uniq_admin_email")]
