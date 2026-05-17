# Plano de Ação — Auditoria de Segurança e Qualidade

> Gerado após auditoria Claude Opus em 2026-05-17.
> Atualizar à medida que cada item for concluído.

---

## Fase 1 — Segurança Crítica

### 1A · Remover dados pessoais do histórico git
- [x] `git filter-repo` para apagar `221030ABR26 - Teste Local - 123456.pdf`
- [x] `git filter-repo` para apagar `backend/temp_docx_fix/`
- [x] Adicionar ao `.gitignore`: `*.pdf`, `temp_docx_fix/`, `*.docx` (exceto template)
- [x] Force push + invalidar caches do GitHub

### 1B · Tokens de sessão seguros
- [x] Substituir `uuid.uuid4()` por `secrets.token_urlsafe(32)` na geração
- [x] Guardar apenas `sha256(token)` na coleção `user_sessions`
- [x] Comparar por hash no `get_current_user`
- [x] Reduzir validade de 30 → 7 dias

### 1C · Desativar endpoint `/api/auth/session` Emergent
- [x] Confirmar que o frontend não usa o endpoint
- [x] Remover o endpoint de `server.py`

### 1D · Timeout e sandbox no gerador de relatórios
- [x] Adicionar `timeout=30` ao `subprocess.run` do LibreOffice (`generator.py`)
- [x] Tratar `subprocess.TimeoutExpired` com RuntimeError → HTTP 503
- [x] Verificar se `docxtpl` usa Jinja2 sandbox; ativar se não usar

---

## Fase 2 — Segurança Alta

### 2A · Rate limiting
- [x] Instalar `slowapi` e adicionar ao `requirements.txt`
- [x] 5 req/min em `/api/auth/login` e `/api/auth/register` por IP
- [x] 3 req/min em `/api/reports/generate` por utilizador
- [ ] 30 req/min global por IP nos restantes endpoints (baixa prioridade)

### 2B · Proteção CSRF nos endpoints destrutivos
- [x] Endpoints de reset/cleanup: rejeitar autenticação por cookie, exigir header `Authorization` (`require_header_auth` dependency)
- [ ] Validar header `Origin` nos POSTs mutáveis (baixa prioridade — coberto pelo CORS)

### 2C · Validação de input consistente
- [x] `email: str` → `email: EmailStr` em `RegisterRequest` e `LoginRequest`
- [x] `Field(ge=0, le=100)` em `value` e `discount_percent`
- [x] Aplicar `validate_date_format` em todos os modelos com campos `date`
- [x] Limitar `photos: List[str]` a máximo 5 itens, cada um com máximo 2 MB

---

## Fase 3 — Bugs Funcionais

### 3A · Corrigir multi-sessões vs. `delete_many` no login
- [x] Decisão: suportar multi-sessão (remover `delete_many` do login)
- [x] Implementar em `server.py` — login já não invalida sessões anteriores

### 3B · Corrigir `createShift` sem tratamento de dia duplicado
- [x] `handleDayPress` já usa upsert via `updateShift` para dias existentes (confirmado)
- [x] try/catch em todos os ramos de criação/edição de turno

### 3C · Corrigir persistência local de `shifts` no dataStore
- [x] Remover `shifts` e `gratifications` de `persistLocalSlice` (`dataStore.ts`)
- [x] `clearSyncedCollections` já limpa estas coleções da memória

---

## Fase 4 — Qualidade e Dívida Técnica

### 4A · Limpar `requirements.txt`
- [x] Remover deps não usadas: `python-jose`, `pyjwt`, `requests-oauthlib`, `requests`, `typer`, `httpx` (server)
- [ ] Fixar todas as versões com `==` (baixa prioridade)
- [x] Verificar que os testes continuam a passar após limpeza

### 4B · Migrar `on_event` → `lifespan`
- [x] Substituir `@app.on_event("startup")` e `@app.on_event("shutdown")` por `@asynccontextmanager lifespan` em `server.py`

### 4C · Substituir `xlsx` (SheetJS npm) com CVEs conhecidas
- [x] Avaliar uso atual: xlsx é usado para escrita (não parsing) — CVE-2023-30533 não é explorável
- [ ] Migrar para `exceljs` quando houver slot (baixa prioridade)

### 4D · Remover `as any` nos ecrãs principais
- [x] `index.tsx`: `useDataStore()` desestruturado diretamente; `shiftTypes.map` sem cast
- [x] `profile.tsx`: `store as any` removido; `cfg[key as keyof]` com tipo correto
- [x] `exportUtils.ts`: `GratifiedEntry` e `BackupPayload` tipados corretamente

### 4E · Limpar artefactos do repositório
- [x] Remover `server_mock.py`, `mock_data.json`, backups `.docx`, `temp_docx_extract/`
- [x] Mover template `.docx` para `backend/reporting/templates/`
- [ ] Avaliar docs de handoff (`PROJECT_PROGRESS.md`, `CHANGELOG_AUDIT.md`) — baixa prioridade

---

## Fase 5 — Arquitetura a Longo Prazo

### 5A · Dividir `server.py` em módulos
- [x] Criar estrutura `backend/routers/`, `backend/models/`, `backend/auth/`, `backend/db.py`
- [x] Migrar endpoints por domínio (auth, shifts, cycles, occurrences, reports, stats)

### 5B · Reescrever autenticação com JWT + refresh token rotativo
- [ ] JWT de curta duração (15 min) + refresh token (7 dias) com rotação
- [ ] Eliminar o modelo UUID plaintext atual
- [ ] Garantir retrocompatibilidade durante migração

### 5C · Definir fronteira clara local vs. servidor no `dataStore`
- [x] Mapear o que é local-only vs. server-backed
- [x] Eliminar IDs temporários `local-${Date.now()}` que nunca sincronizam (cycles, gratifiedEntries)
- [x] Documentar a separação (comentário de bloco no topo de dataStore.ts)
- [x] Guardar API calls com IDs locais (shiftTypes: isLocalId guard)
- [x] loadData limpo — removidos campos obsoletos (shifts, gratifications)

### 5D · Mover fotos para object storage
- [ ] Avaliar Cloudflare R2 ou equivalente
- [ ] Substituir `photos: List[str]` (base64) por `photos: List[url]`
- [ ] Migrar dados existentes

### 5E · Observabilidade em produção
- [ ] Adicionar Sentry ao backend (`sentry-sdk[fastapi]`)
- [ ] Adicionar Sentry ao frontend Expo
- [ ] Definir alertas para erros 5xx e autenticações falhadas

### 5F · Cobertura de testes
- [x] Testes para endpoint `/api/reports/generate` (`test_reports.py` — 6 testes)
- [x] Testes para CRUD de cycles (`test_cycles.py` — 6 testes)
- [x] Testes para gratificações (`test_gratifications.py` — 14 testes)
- [ ] Testes para rate limiting (mock do slowapi) — baixa prioridade

---

## Progresso

| Fase | Total | Feito | % |
|------|-------|-------|---|
| Fase 1 — Crítica | 12 | 12 | 100% |
| Fase 2 — Alta | 10 | 8 | 80% |
| Fase 3 — Bugs | 6 | 6 | 100% |
| Fase 4 — Qualidade | 13 | 10 | 77% |
| Fase 5 — Arquitetura | 12 | 8 | 67% |
| **Total** | **53** | **44** | **83%** |
