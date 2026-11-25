"""Cria (ou atualiza a senha de) um administrador do painel.

Uso (dentro de backend/, com o .venv ativo):
    python -m scripts.create_admin
"""

import asyncio
import getpass
import re

from app.core.security import hash_password
from app.db.mongodb import connect_to_mongo
from app.models import AdminUser
from app.models.base import utc_now

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def ask(prompt: str) -> str:
    while True:
        value = input(prompt).strip()
        if value:
            return value


def ask_password() -> str:
    while True:
        password = getpass.getpass("Senha (mínimo 10 caracteres, não aparece ao digitar): ")
        if len(password) < 10:
            print("  A senha precisa ter pelo menos 10 caracteres.")
            continue
        if password != getpass.getpass("Repita a senha: "):
            print("  As senhas não conferem. Tente de novo.")
            continue
        return password


async def main() -> None:
    print("Criar administrador do painel Tabajara\n")
    name = ask("Nome: ")
    email = ask("E-mail: ").lower()
    while not EMAIL_RE.match(email):
        print("  E-mail inválido.")
        email = ask("E-mail: ").lower()
    password = ask_password()

    client = await connect_to_mongo()
    try:
        admin = await AdminUser.find_one({"email": email})
        if admin:
            admin.name = name
            admin.password_hash = hash_password(password)
            admin.failed_attempts = 0
            admin.locked_until = None
            admin.tokens_valid_after = utc_now()  # derruba sessões abertas com a senha antiga
            admin.active = True
            await admin.save()
            print(f"\nSenha atualizada para {email}.")
        else:
            await AdminUser(name=name, email=email, password_hash=hash_password(password)).insert()
            print(f"\nAdministrador {email} criado.")
        print("Acesse o painel em http://localhost:5173/admin")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
