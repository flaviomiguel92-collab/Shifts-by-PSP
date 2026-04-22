from datetime import datetime
import re


PT_MONTH_ABBR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]


def _sanitize_segment(value: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]+', "", (value or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "Sem dado"


def build_servico_remunerado_file_name(report_date: str, report_hour: str, remunerated_name: str, graduado_matricula: str) -> str:
    dt = datetime.strptime(report_date, "%Y-%m-%d")
    day = f"{dt.day:02d}"
    month = PT_MONTH_ABBR[dt.month - 1]
    year = str(dt.year)[-2:]
    hhmm = (report_hour or "").replace(":", "").strip().zfill(4)[:4]

    remun = _sanitize_segment(remunerated_name)
    matricula = _sanitize_segment(graduado_matricula)
    return f"{day}{hhmm}{month}{year} - {remun} - {matricula}.pdf"
