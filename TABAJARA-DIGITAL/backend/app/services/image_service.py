"""Otimização de imagens dos produtos (usado pelo seed e, depois, pelo upload do painel)."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIZE = (1200, 1200)
# Recusa "bombas de descompressão" (arquivo pequeno que vira imagem gigante na memória).
Image.MAX_IMAGE_PIXELS = 40_000_000
WEBP_QUALITY = 80


def optimize_to_webp(data: bytes, destination: Path, max_size: tuple[int, int] = MAX_SIZE) -> Path:
    """Corrige a rotação, reduz para no máximo 1200 px e salva em WebP (arquivo leve para celular)."""
    try:
        opened = Image.open(BytesIO(data))
    except Image.DecompressionBombError as exc:
        raise OSError("Imagem grande demais.") from exc
    if opened.format not in {"JPEG", "PNG", "WEBP", "MPO"}:
        opened.close()
        raise OSError("Formato de imagem não permitido.")
    try:
        with opened as image:
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            destination.parent.mkdir(parents=True, exist_ok=True)
            # salvar de novo em WebP descarta metadados (localização GPS etc.) e qualquer conteúdo escondido
            image.save(destination, "WEBP", quality=WEBP_QUALITY, method=6)
    except Image.DecompressionBombError as exc:
        raise OSError("Imagem grande demais.") from exc
    return destination
