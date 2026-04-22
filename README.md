# Shift Olama

## Geração de PDF (LibreOffice)

Se aparecer o erro de conversão para PDF indisponível por falta de LibreOffice, o backend precisa de correr num ambiente com `soffice`.

Foi adicionado suporte no backend para:

- Descobrir automaticamente `soffice`/`libreoffice` no `PATH`
- Usar variável de ambiente `LIBREOFFICE_BIN` quando necessário

Também foi adicionado um container pronto em [backend/Dockerfile](backend/Dockerfile) com LibreOffice instalado.

Guia rápido de deploy e configuração:

- Ver [backend/DEPLOY_PDF.md](backend/DEPLOY_PDF.md)
