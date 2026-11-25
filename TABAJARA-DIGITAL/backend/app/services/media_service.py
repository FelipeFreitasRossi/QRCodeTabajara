"""Fotos enviadas: salvas no disco (cache rápido) e no MongoDB (cópia permanente).

Em hospedagens com disco temporário (Render gratuito), o disco é apagado a cada reinício.
Ao pedir /uploads/<arquivo>, a API usa o disco se o arquivo existir; senão busca no banco
e recria o arquivo no disco.
"""

import asyncio
import logging
import mimetypes
import os
import tempfile
from pathlib import Path, PurePosixPath

from bson import Binary
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.models.base import utc_now
from app.models.stored_file import StoredFile
from app.services.image_service import MAX_SIZE, optimize_to_webp

logger = logging.getLogger("tabajara.midia")

UPLOADS_PREFIX = "/uploads/"


def safe_relative(path: str) -> str | None:
    """Caminho relativo seguro dentro de uploads/ (recusa "..", caminhos absolutos etc.)."""
    if not path or "\\" in path or "\x00" in path:
        return None
    pure = PurePosixPath(path)
    # também recusa arquivos ocultos (.gitkeep, temporários ".tmp-...")
    if pure.is_absolute() or not pure.parts or any(part in {"", ".", ".."} or part.startswith(".") for part in pure.parts):
        return None
    return pure.as_posix()


def disk_path(relative: str) -> Path | None:
    uploads = settings.uploads_dir.resolve()
    full = (uploads / relative).resolve()
    return full if uploads in full.parents else None


def _write_atomic(destination: Path, data: bytes) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=destination.parent, prefix=".tmp-")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        os.replace(tmp, destination)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


async def persist(relative: str) -> None:
    """Copia um arquivo de uploads/ para o banco (substitui a cópia anterior do mesmo caminho)."""
    full = disk_path(relative)
    if full is None or not full.is_file():
        return
    data = await asyncio.to_thread(full.read_bytes)
    content_type = mimetypes.guess_type(full.name)[0] or "application/octet-stream"
    await StoredFile.get_pymongo_collection().update_one(
        {"path": relative},
        {
            "$set": {"content_type": content_type, "size": len(data), "data": Binary(data)},
            "$setOnInsert": {"created_at": utc_now()},
        },
        upsert=True,
    )


async def save_image(data: bytes, folder: str, filename: str, max_size: tuple[int, int] = MAX_SIZE) -> str:
    """Otimiza a imagem, grava no disco e no banco. Devolve a URL pública (/uploads/...)."""
    relative = f"{folder}/{filename}"
    destination = disk_path(relative)
    if destination is None:
        raise OSError("Nome de arquivo inválido.")
    await asyncio.to_thread(optimize_to_webp, data, destination, max_size)
    try:
        await persist(relative)
    except PyMongoError:
        destination.unlink(missing_ok=True)
        raise
    return UPLOADS_PREFIX + relative


async def delete_uploaded_file(url: str | None) -> None:
    """Apaga uma foto antiga do disco e do banco (só dentro de uploads/)."""
    if not url or not url.startswith(UPLOADS_PREFIX):
        return
    relative = safe_relative(url.removeprefix(UPLOADS_PREFIX))
    if relative is None:
        return
    full = disk_path(relative)
    if full is not None and full.is_file():
        full.unlink(missing_ok=True)
    try:
        await StoredFile.get_pymongo_collection().delete_one({"path": relative})
    except PyMongoError:
        logger.warning("Não consegui apagar a cópia de %s no banco.", relative)


async def restore(relative: str) -> Path | None:
    """Arquivo no disco; se não existir, recria a partir do banco. None se não houver em nenhum dos dois."""
    full = disk_path(relative)
    if full is None:
        return None
    if full.is_file():
        return full
    doc = await StoredFile.get_pymongo_collection().find_one({"path": relative}, {"data": 1})
    if not doc:
        return None
    await asyncio.to_thread(_write_atomic, full, bytes(doc["data"]))
    return full


async def sync_folder() -> int:
    """Envia ao banco todos os arquivos de uploads/ que ainda não estão lá. Não apaga nada."""
    uploads = settings.uploads_dir.resolve()
    if not uploads.is_dir():
        return 0
    collection = StoredFile.get_pymongo_collection()
    sent = 0
    for full in sorted(uploads.rglob("*")):
        if not full.is_file() or full.name.startswith("."):
            continue
        relative = full.relative_to(uploads).as_posix()
        if await collection.count_documents({"path": relative}, limit=1):
            continue
        await persist(relative)
        sent += 1
    return sent
