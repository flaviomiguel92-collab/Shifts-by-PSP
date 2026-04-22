from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Dict, Any
import base64
import shutil
import subprocess
import zipfile
from docxtpl import DocxTemplate


def resolve_existing_template_path(candidates: list[Path]) -> Path:
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    searched = "\n".join(str(path) for path in candidates)
    raise FileNotFoundError(
        "Template .docx não encontrado. Configure SERVICO_REMUNERADO_TEMPLATE_PATH ou coloque o ficheiro numa das localizações:\n"
        f"{searched}"
    )


def render_docx(template_path: Path, context: Dict[str, Any], output_docx_path: Path) -> None:
    with zipfile.ZipFile(template_path) as archive:
        xml_content = archive.read("word/document.xml").decode("utf-8", errors="ignore")
        if "{{" not in xml_content and "{%" not in xml_content:
            raise RuntimeError(
                "O template Word ainda não tem placeholders técnicos (Jinja/docxtpl). "
                "Atualize o .docx conforme backend/reporting/TEMPLATE_FIELDS.md."
            )

    document = DocxTemplate(str(template_path))
    document.render(context)
    document.save(str(output_docx_path))


def convert_docx_to_pdf(docx_path: Path, output_dir: Path) -> Path:
    office_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not office_bin:
        raise RuntimeError(
            "Conversão para PDF indisponível: LibreOffice (soffice) não instalado no servidor."
        )

    command = [
        office_bin,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        str(docx_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Falha na conversão DOCX->PDF: {result.stderr or result.stdout}")

    pdf_path = output_dir / f"{docx_path.stem}.pdf"
    if not pdf_path.exists():
        raise RuntimeError("Conversão concluída sem gerar ficheiro PDF.")
    return pdf_path


def generate_pdf_base64(template_path: Path, context: Dict[str, Any], output_name: str) -> str:
    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        docx_output = temp_path / f"{Path(output_name).stem}.docx"
        render_docx(template_path, context, docx_output)
        pdf_output = convert_docx_to_pdf(docx_output, temp_path)
        return base64.b64encode(pdf_output.read_bytes()).decode("utf-8")
