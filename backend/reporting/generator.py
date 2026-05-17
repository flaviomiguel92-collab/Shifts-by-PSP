"""Fill the official PSP service-report Word template and optionally convert to PDF."""
import io
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from docxtpl import DocxTemplate

TEMPLATE_PATH = Path(__file__).parent / "templates" / "relatorio_servico_remunerado.docx"


def _fix_template_xml(raw_bytes: bytes) -> bytes:
    """
    Word inserts spell-check markers inside Jinja placeholders, splitting them
    across multiple <w:r> runs.  Strip the XML noise from within {{ }} / {% %}
    blocks so docxtpl can parse them correctly.
    """
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as src:
        files = {name: src.read(name) for name in src.namelist()}

    xml = files["word/document.xml"].decode("utf-8")
    xml = re.sub(
        r"\{\{[^}]*\}\}|\{%[^%]*%\}",
        lambda m: re.sub(r"<[^>]+>", "", m.group(0)),
        xml,
        flags=re.DOTALL,
    )
    files["word/document.xml"] = xml.encode("utf-8")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as dst:
        for name, data in files.items():
            dst.writestr(name, data)
    return buf.getvalue()


def _resolve_libreoffice() -> str | None:
    """Return the LibreOffice binary path if available, else None."""
    custom = os.environ.get("LIBREOFFICE_BIN")
    if custom and shutil.which(custom):
        return custom
    for candidate in ("soffice", "libreoffice"):
        found = shutil.which(candidate)
        if found:
            return found
    return None


def render_docx(context: dict[str, Any]) -> bytes:
    """Render the template with *context* and return the filled DOCX bytes."""
    raw = TEMPLATE_PATH.read_bytes()
    fixed = _fix_template_xml(raw)
    doc = DocxTemplate(io.BytesIO(fixed))
    doc.render(context)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def convert_to_pdf(docx_bytes: bytes) -> bytes:
    """
    Convert DOCX bytes to PDF via LibreOffice headless.
    Raises RuntimeError if LibreOffice is not installed or times out.
    """
    lo_bin = _resolve_libreoffice()
    if not lo_bin:
        raise RuntimeError(
            "Conversão para PDF indisponível: LibreOffice (soffice) não instalado no servidor."
        )

    with tempfile.TemporaryDirectory() as tmp:
        docx_path = os.path.join(tmp, "report.docx")
        Path(docx_path).write_bytes(docx_bytes)

        try:
            subprocess.run(
                [
                    lo_bin,
                    "--headless",
                    "--norestore",
                    "--nofirststartwizard",
                    "--convert-to", "pdf",
                    "--outdir", tmp,
                    docx_path,
                ],
                check=True,
                capture_output=True,
                timeout=30,
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError("Conversão para PDF excedeu o tempo limite (30s).")

        pdf_path = os.path.join(tmp, "report.pdf")
        return Path(pdf_path).read_bytes()
