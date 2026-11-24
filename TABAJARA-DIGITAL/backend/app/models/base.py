"""Campos comuns a todos os documentos."""

from datetime import datetime, timezone

from beanie import Document, Insert, Replace, Save, before_event
from pydantic import Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampedDocument(Document):
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert, Replace, Save)
    def _touch_updated_at(self) -> None:
        self.updated_at = utc_now()
