"""Cópia das fotos enviadas, guardada no MongoDB.

Hospedagens gratuitas (ex.: Render) apagam o disco do servidor a cada reinício.
A pasta uploads/ continua sendo usada como cache rápido; se o arquivo sumir do disco,
a API busca aqui e recria o arquivo automaticamente.
"""

from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import utc_now


class StoredFile(Document):
    path: str  # relativo a uploads/, ex.: "produtos/picanha-1a2b3c4d.webp"
    content_type: str
    size: int
    data: bytes  # a imagem (WebP já otimizada; poucas centenas de KB)
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "stored_files"
        indexes = [IndexModel([("path", ASCENDING)], unique=True, name="uniq_stored_file_path")]
