# Shift Olama

## Geração de PDF (LibreOffice)

Se aparecer o erro de conversão para PDF indisponível por falta de LibreOffice, o backend precisa de correr num ambiente com `soffice`.

Foi adicionado suporte no backend para:

- Descobrir automaticamente `soffice`/`libreoffice` no `PATH`
- Usar variável de ambiente `LIBREOFFICE_BIN` quando necessário

Também foi adicionado um container pronto em [backend/Dockerfile](backend/Dockerfile) com LibreOffice instalado.

No Render, o projeto já inclui [render.yaml](render.yaml) para forçar deploy via Docker no diretório `backend`.

Guia rápido de deploy e configuração:

- Ver [backend/DEPLOY_PDF.md](backend/DEPLOY_PDF.md)

## Teste rápido (1 comando)

Com o backend a correr localmente em `http://127.0.0.1:8000`, execute:

- `python backend/test_report_pdf.py`

Para escolher outra API/pasta de saída:

- `python backend/test_report_pdf.py --base-url http://127.0.0.1:8000 --output-dir backend`
