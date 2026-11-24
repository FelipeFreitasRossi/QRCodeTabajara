import re
import unicodedata


def slugify(text: str) -> str:
    """'Pão de Alho' -> 'pao-de-alho'. Usado para evitar categorias e produtos duplicados."""
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
