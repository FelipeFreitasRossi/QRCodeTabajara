"""CPF: validação pelos dígitos verificadores e hash para busca sem guardar o número."""

import hashlib
import hmac
import re

from app.core.config import settings


def only_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def is_valid_cpf(value: str) -> bool:
    cpf = only_digits(value)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for size in (9, 10):
        total = sum(int(cpf[i]) * (size + 1 - i) for i in range(size))
        digit = (total * 10) % 11 % 10
        if digit != int(cpf[size]):
            return False
    return True


def cpf_hash(value: str) -> str:
    """HMAC-SHA256 do CPF: permite encontrar o cadastro sem guardar o CPF em texto."""
    key = (settings.cpf_hash_key or settings.jwt_secret).encode("utf-8")
    return hmac.new(key, only_digits(value).encode("utf-8"), hashlib.sha256).hexdigest()


def cpf_tail(value: str) -> str:
    """Só o final, para o cliente e a equipe reconhecerem: •••.•••.789-01"""
    cpf = only_digits(value)
    return f"•••.•••.{cpf[6:9]}-{cpf[9:]}"
