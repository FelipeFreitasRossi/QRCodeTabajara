"""Copia as fotos da pasta uploads/ para o MongoDB (necessário antes de publicar no Render).

O Render gratuito apaga o disco a cada reinício; com a cópia no banco, a API recria as fotos sozinha.
Seguro para rodar várias vezes: só envia o que ainda não está no banco e não apaga nada.

Uso (com o .env apontando para o banco da hospedagem, ex.: MongoDB Atlas):
    python -m scripts.sync_uploads
"""

import asyncio

from app.core.config import settings
from app.db.mongodb import connect_to_mongo
from app.services import media_service


async def main() -> None:
    client = await connect_to_mongo()
    try:
        print(f"Enviando fotos de {settings.uploads_dir} para o banco '{settings.mongodb_db}'...")
        sent = await media_service.sync_folder()
        print(f"Pronto. Fotos enviadas agora: {sent} (as que já estavam no banco foram mantidas).")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
