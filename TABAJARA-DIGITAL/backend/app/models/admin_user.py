"""Usuário do painel administrativo. Crie com: python -m scripts.create_admin"""

from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class AdminUser(TimestampedDocument):
    name: str
    email: str  # sempre em minúsculas
    password_hash: str
    role: str = "admin"  # preparado para outros perfis no futuro (ex.: "cozinha")
    active: bool = True

    class Settings:
        name = "admin_users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True, name="uniq_admin_email")]
