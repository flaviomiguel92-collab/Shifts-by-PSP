"""Validate submitted photos and store portable data URIs without EXIF metadata."""
import base64
import binascii
import io

from PIL import Image, UnidentifiedImageError

MAX_PHOTOS = 5
MAX_PHOTO_CHARS = 3_000_000


def normalize_photo(value: str) -> str:
    if len(value) > MAX_PHOTO_CHARS:
        raise ValueError("Cada foto não pode exceder 2 MB")
    encoded = value
    if value.startswith("data:"):
        header, separator, encoded = value.partition(",")
        if not separator or not header.startswith("data:image/") or not header.endswith(";base64"):
            raise ValueError("Formato de imagem inválido")
    try:
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            fmt = image.format
            if fmt not in ("JPEG", "PNG", "GIF", "WEBP") or image.width * image.height > 20_000_000:
                raise ValueError("Formato ou dimensões de imagem inválidos")
            image.verify()
        with Image.open(io.BytesIO(raw)) as image:
            # A fresh image drops EXIF, GPS and other source metadata.
            clean = Image.new("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB", image.size)
            clean.paste(image.convert(clean.mode))
            if fmt == "JPEG":
                clean = clean.convert("RGB")
            output = io.BytesIO()
            clean.save(output, format=fmt)
        mime = {"JPEG": "jpeg", "PNG": "png", "GIF": "gif", "WEBP": "webp"}[fmt]
        result = f"data:image/{mime};base64," + base64.b64encode(output.getvalue()).decode("ascii")
        if len(result) > MAX_PHOTO_CHARS:
            raise ValueError("Cada foto não pode exceder 2 MB")
        return result
    except (binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("Dados de imagem inválidos") from exc


def normalize_photos(values):
    if values is None:
        return None
    if len(values) > MAX_PHOTOS:
        raise ValueError(f"Máximo de {MAX_PHOTOS} fotos permitidas")
    return [normalize_photo(value) for value in values]
