# Plano de Ação — Auditoria de Segurança e Qualidade

> Gerado após auditoria Claude Opus em 2026-05-17.
> Atualizar à medida que cada item for concluído.

---

## Fase 1 — Segurança Crítica

### 1A · Remover dados pessoais do histórico git
- [ ] `git filter-repo` para apagar `221030ABR26 - Teste Local - 123456.pdf`
- [ ] `git filter-repo` para apagar `backend/temp_docx_fix/`
- [ ] Adicionar ao `.gitignore`: `*.pdf`, `temp_docx_fix/`, `*.docx` (exceto template)
- [ ] Force push + invalidar caches do GitHub

### 1B · Tokens de sessão seguros
- [ ] Substituir `uuid.uuid4()` por `secrets.token_urlsafe(32)` na geração (`server.py:278`)
- [ ] Guardar apenas `sha256(token)` na coleção `user_sessions`
- [ ] Comparar por hash no `get_current_user` (`server.py:194`)
- [ ] Reduzir validade de 30 → 7 dias

### 1C · Desativar endpoint `/api/auth/session` Emergent
- [ ] Confirmar que o frontend não usa o endpoint
- [ ] Remover o endpoint de `server.py` (linhas 301–328)

### 1D · Timeout e sandbox no gerador de relatórios
- [ ] Adicionar `timeout=30` ao `subprocess.run` do LibreOffice (`generator.py:80`)
- [ ] Tratar `subprocess.TimeoutExpired` com HTTP 504
- [ ] Verificar se `docxtpl` usa Jinja2 sandbox; ativar se não usar

---

## Fase 2 — Segurança Alta

### 2A · Rate limiting
- [ ] Instalar `slowapi` e adicionar ao `requirements.txt`
- [ ] 5 req/min em `/api/auth/login` e `/api/auth/register` por IP
- [ ] 3 req/min em `/api/reports/generate` por utilizador
- [ ] 30 req/min global por IP nos restantes endpoints

### 2B · Proteção CSRF nos endpoints destrutivos
- [ ] Endpoints de reset/cleanup: rejeitar autenticação por cookie, exigir header `Authorization`
- [ ] Validar header `Origin` nos POSTs mutáveis

### 2C · Validação de input consistente
- [ ] `email: str` → `email: EmailStr` em `RegisterRequest` e `LoginRequest`
- [ ] `Field(ge=0, le=100)` em `value` e `discount_percent`
- [ ] Aplicar `validate_date_format` em todos os modelos com campos `date`
- [ ] Limitar `photos: List[str]` a máximo 5 itens, cada um com máximo 2 MB

---

## Fase 3 — Bugs Funcionais

### 3A · Corrigir multi-sessões vs. `delete_many` no login
- [ ] Decisão: suportar multi-sessão a sério (remover `delete_many` do login) OU remover UI de sessões ativas
- [ ] Implementar a decisão em `server.py` e `profile.tsx`

### 3B · Corrigir `createShift` sem tratamento de dia duplicado
- [ ] `handleDayPress` em `index.tsx`: usar upsert (`/api/shifts/bulk`) em vez de `createShift` para dias com turno existente
- [ ] Garantir try/catch no ramo de criação de turno

### 3C · Corrigir persistência local de `shifts` no dataStore
- [ ] Remover `shifts` e `gratifications` de `persistLocalSlice` (`dataStore.ts`)
- [ ] Garantir que `clearSyncedCollections` apaga estes dados do localStorage

---

## Fase 4 — Qualidade e Dívida Técnica

### 4A · Limpar `requirements.txt`
- [ ] Remover deps não usadas: `python-jose`, `pyjwt`, `requests-oauthlib`, `requests`, `typer`, `cryptography`
- [ ] Fixar todas as versões com `==`
- [ ] Verificar que os testes continuam a passar após limpeza

### 4B · Migrar `on_event` → `lifespan`
- [ ] Substituir `@app.on_event("startup")` e `@app.on_event("shutdown")` por `@asynccontextmanager lifespan` em `server.py`

### 4C · Substituir `xlsx` (SheetJS npm) com CVEs conhecidas
- [ ] Avaliar uso atual de `xlsx` em `exportUtils.ts`
- [ ] Migrar para `exceljs` ou remover se só é usado para CSV
- [ ] Remover `xlsx` do `package.json`

### 4D · Remover `as any` nos ecrãs principais
- [ ] `index.tsx`: tipar `store`, `shiftTypes`, `shifts` corretamente
- [ ] `profile.tsx`: tipar `store as any` e `cfg as any`

### 4E · Limpar artefactos do repositório
- [ ] Remover da raiz do backend: `server_mock.py`, `backend_test.py`, `mock_data.json`
- [ ] Mover template `.docx` para `backend/reporting/templates/`
- [ ] Avaliar docs de handoff (`PROJECT_PROGRESS.md`, `CHANGELOG_AUDIT.md`, `COMPONENT_MAP.md`) — mover para `docs/` ou apagar

---

## Fase 5 — Arquitetura a Longo Prazo

### 5A · Dividir `server.py` em módulos
- [ ] Criar estrutura `backend/routers/`, `backend/models/`, `backend/auth/`, `backend/db.py`
- [ ] Migrar endpoints por domínio (auth, shifts, cycles, occurrences, reports, stats)

### 5B · Reescrever autenticação com JWT + refresh token rotativo
- [ ] JWT de curta duração (15 min) + refresh token (7 dias) com rotação
- [ ] Eliminar o modelo UUID plaintext atual
- [ ] Garantir retrocompatibilidade durante migração

### 5C · Definir fronteira clara local vs. servidor no `dataStore`
- [ ] Mapear o que é local-only vs. server-backed
- [ ] Eliminar IDs temporários `local-${Date.now()}` que nunca sincronizam
- [ ] Documentar a separação

### 5D · Mover fotos para object storage
- [ ] Avaliar Cloudflare R2 ou equivalente
- [ ] Substituir `photos: List[str]` (base64) por `photos: List[url]`
- [ ] Migrar dados existentes

### 5E · Observabilidade em produção
- [ ] Adicionar Sentry ao backend (`sentry-sdk[fastapi]`)
- [ ] Adicionar Sentry ao frontend Expo
- [ ] Definir alertas para erros 5xx e autenticações falhadas

### 5F · Cobertura de testes
- [ ] Testes para endpoint `/api/reports/generate`
- [ ] Testes para CRUD de cycles
- [ ] Testes para gratificações
- [ ] Testes para rate limiting (mock do slowapi)

---

## Progresso

| Fase | Total | Feito | % |
|------|-------|-------|---|
| Fase 1 — Crítica | 12 | 0 | 0% |
| Fase 2 — Alta | 10 | 0 | 0% |
| Fase 3 — Bugs | 6 | 0 | 0% |
| Fase 4 — Qualidade | 13 | 0 | 0% |
| Fase 5 — Arquitetura | 12 | 0 | 0% |
| **Total** | **53** | **0** | **0%** |
