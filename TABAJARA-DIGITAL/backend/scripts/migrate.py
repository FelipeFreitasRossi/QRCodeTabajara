"""Atualiza um banco existente para a versão com Clube Tabajara e QR por mesa.

Seguro para rodar mais de uma vez. NÃO apaga nem altera dados existentes:
- só preenche o código do QR nas mesas que ainda não têm;
- cria os índices novos (clientes, pontos);
- cria as regras padrão do Clube se ainda não existirem;
- coloca a foto de exemplo nas seções que ainda não têm foto (não troca foto existente);
- copia as fotos da pasta uploads/ para o banco (só as que ainda não estão lá).

Uso:  python -m scripts.migrate
"""

import asyncio
import secrets

from app.db.mongodb import connect_to_mongo
from app.models import Category, DiningTable
from app.services import loyalty_service, media_service
from scripts.seed import category_photo


async def main() -> None:
    client = await connect_to_mongo()  # também cria os índices novos
    try:
        filled = 0
        for table in await DiningTable.find({"$or": [{"qr_token": None}, {"qr_token": {"$exists": False}}]}).to_list():
            table.qr_token = secrets.token_urlsafe(9)
            await table.save()
            filled += 1
        print(f"Mesas que ganharam QR Code: {filled}")
        photos = 0
        for category in await Category.find_all().to_list():
            if category_photo(category):  # só seções conhecidas e ainda sem foto
                await category.save()
                photos += 1
        print(f"Seções que ganharam foto: {photos}")
        print(f"Fotos copiadas para o banco (proteção contra disco apagado na hospedagem): {await media_service.sync_folder()}")
        settings = await loyalty_service.get_settings()
        print(f"Clube Tabajara: {'ativo' if settings.enabled else 'desligado'} · {settings.points_per_real} ponto(s) por real")
        print("Pronto. Nenhum dado existente foi apagado.")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
