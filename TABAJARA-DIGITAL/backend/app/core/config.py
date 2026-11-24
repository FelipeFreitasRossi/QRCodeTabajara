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
    def cors_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
