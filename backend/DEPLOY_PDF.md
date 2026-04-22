# Deploy do backend com geração de PDF

Este documento explica como eliminar o erro:

`Conversão para PDF indisponível: LibreOffice (soffice) não instalado no servidor.`

## 1) Opção recomendada: deploy via Docker

Usa o container em [backend/Dockerfile](backend/Dockerfile), que já instala LibreOffice.

### Build local

```bash
docker build -t shift-backend-pdf ./backend
```

### Run local

```bash
docker run --rm -p 8000:8000 -e PORT=8000 shift-backend-pdf
```

Backend disponível em `http://localhost:8000`.

## 2) Deploy sem Docker

Instala LibreOffice no host e garante que o binário está no `PATH`.

- Linux (Debian/Ubuntu): `apt-get install libreoffice libreoffice-writer`
- O backend procura automaticamente por `soffice` ou `libreoffice`

Se o binário estiver num caminho não padrão, define:

- `LIBREOFFICE_BIN=/caminho/para/soffice`

Exemplo Linux comum:

- `LIBREOFFICE_BIN=/usr/bin/soffice`

## 3) O que foi alterado no código

- [resolve_office_bin()](backend/reporting/generator.py:36): nova função para resolver o binário via `LIBREOFFICE_BIN` ou `PATH`
- [convert_docx_to_pdf()](backend/reporting/generator.py:62): passa a usar `resolve_office_bin`

## 4) Verificação rápida

No ambiente de produção, valida que o comando existe:

```bash
soffice --version
```

Depois, testa o endpoint `POST /api/reports/generate`.
