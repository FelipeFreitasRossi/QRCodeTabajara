"""Configurações da aplicação, lidas do arquivo .env (nunca coloque segredos no código)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # pasta backend/


class Settings(BaseSettings):
    app_name: str = "Tabajara Digital API"
    environment: str = "development"

    mongodb_url: str
    mongodb_db: str = "tabajara"

    jwt_secret: str
    # 12 horas: o painel costuma ficar aberto o turno inteiro no caixa/cozinha.
    jwt_expires_minutes: int = 720

    timezone: str = "America/Sao_Paulo"
    max_upload_mb: int = 8

    # Endereço público do site (usado nos QR Codes das mesas).
    public_site_url: str = "http://localhost:5173"

    # Sessão do cliente do Clube Tabajara.
    customer_token_days: int = 30  # com "Manter conectado neste celular"
    customer_visit_hours: int = 3  # padrão: login vale só para a visita
    # Chave para guardar o CPF como hash (HMAC). Defina uma vez e NUNCA troque:
    # trocar impede encontrar os cadastros existentes. Se vazia, usa o JWT_SECRET.
    cpf_hash_key: str | None = None

    cors_origins: str = "http://localhost:5173"

    uploads_dir: Path = BASE_DIR / "uploads"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "producao", "produção", "prod"}

    def security_problems(self) -> list[str]:
        """Configurações inseguras. Em produção a API não sobe com nenhuma delas."""
        problems: list[str] = []
        weak = {"troque-esta-chave", "troque-por-uma-chave-secreta-longa", "change-me", "secret", "changeme"}
        if len(self.jwt_secret) < 32 or self.jwt_secret.lower() in weak:
            problems.append("JWT_SECRET fraco: use pelo menos 32 caracteres aleatórios.")
        if not self.cpf_hash_key or len(self.cpf_hash_key) < 32 or self.cpf_hash_key == "troque-esta-chave-tambem":
            problems.append("CPF_HASH_KEY ausente ou curto: defina uma chave própria de 32+ caracteres (e nunca a troque).")
        if "*" in self.cors_list:
            problems.append("CORS_ORIGINS não pode ser '*': liste só o endereço do site.")
        if self.is_production and not self.public_site_url.startswith("https://"):
            problems.append("PUBLIC_SITE_URL precisa usar https:// em produção.")
        if self.is_production and any(o.startswith("http://") for o in self.cors_list):
            problems.append("CORS_ORIGINS em produção deve ter só endereços https://.")
        return problems

    @property
    def cors_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
