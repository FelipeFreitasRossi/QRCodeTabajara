"""Otimização de imagens dos produtos (usado pelo seed e, depois, pelo upload do painel)."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIZE = (1200, 1200)
WEBP_QUALITY = 80


def optimize_to_webp(data: bytes, destination: Path, max_size: tuple[int, int] = MAX_SIZE) -> Path:
    """Corrige a rotação, reduz para no máximo 1200 px e salva em WebP (arquivo leve para celular)."""
    with Image.open(BytesIO(data)) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=WEBP_QUALITY, method=6)
    return destination
