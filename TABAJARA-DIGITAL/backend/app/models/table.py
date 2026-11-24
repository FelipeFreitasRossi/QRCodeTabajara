"""Mesa do restaurante. Cada mesa tem um QR Code próprio (/m/<qr_token>) que abre o cardápio já com a mesa."""

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class DiningTable(TimestampedDocument):
    number: int = Field(ge=1)
    slug: str  # ex.: "mesa-01"
    label: str | None = None  # ex.: "Varanda", "Salão principal"
    active: bool = True
    seats: int = Field(default=4, ge=1, le=50)
    # Código aleatório do QR Code (não é o número da mesa, para não ser adivinhado).
    qr_token: str | None = None

    class Settings:
        name = "tables"
        indexes = [
            IndexModel([("slug", ASCENDING)], unique=True, name="uniq_table_slug"),
            IndexModel([("number", ASCENDING)], unique=True, name="uniq_table_number"),
            IndexModel(
                [("qr_token", ASCENDING)],
                unique=True,
                partialFilterExpression={"qr_token": {"$type": "string"}},
                name="uniq_table_qr_token",
            ),
        ]

    @staticmethod
    def slug_for(number: int) -> str:
        return f"mesa-{number:02d}"
