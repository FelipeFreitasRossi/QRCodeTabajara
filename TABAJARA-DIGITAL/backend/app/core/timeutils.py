from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


def start_of_today_utc() -> datetime:
    """Meia-noite de hoje no fuso do restaurante, convertida para UTC (para consultas no banco)."""
    tz = ZoneInfo(settings.timezone)
    local_midnight = datetime.combine(datetime.now(tz).date(), time.min, tzinfo=tz)
    return local_midnight.astimezone(timezone.utc)
