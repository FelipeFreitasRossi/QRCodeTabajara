"""Conexão com o MongoDB e inicialização do Beanie (cria os índices automaticamente)."""

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models import DOCUMENT_MODELS


async def connect_to_mongo() -> AsyncMongoClient:
    client: AsyncMongoClient = AsyncMongoClient(settings.mongodb_url, tz_aware=True)
    await init_beanie(
        database=client[settings.mongodb_db],
        document_models=DOCUMENT_MODELS,
    )
    return client
