from PIL import Image


def extract_text(image: Image.Image) -> dict:
    """Run local Tesseract OCR when installed; report its absence honestly."""
    try:
        import pytesseract
        text = pytesseract.image_to_string(image, timeout=12).strip()
        return {"text": text, "confidence": None, "available": True}
    except Exception:
        return {"text": "", "confidence": None, "available": False}
