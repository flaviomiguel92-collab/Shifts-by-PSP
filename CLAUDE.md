# Handoff para Claude

Este ficheiro resume o estado atual do projeto para que qualquer assistente consiga continuar sem perder contexto.

## Estado atual

- Branch local/remota: `master`
- Repositório remoto: `origin` em `https://github.com/flaviomiguel92-collab/Shifts-by-PSP.git`
- Working tree com alterações não commitadas (ver git status)
- Último commit pushado: `4b625a7 refactor: audit fixes — security, typing, component extraction`

## Histórico de commits relevantes

| Commit | Descrição |
|--------|-----------|
| `4b625a7` | Audit completo: segurança backend, tipagem TypeScript, extração de componentes |
| `40a47e9` | Fix deploy Vercel (caminho frontend/frontend) |
| `850694f` | Fix CI: substituir vercel-action por vercel CLI latest |
| `e8509d6` | Segurança: cleanup por user_id, /auth/me sem password_hash |
| `bbd0545` | Remover Metro cache do controlo de versão |

## O que foi feito (completo)

### Backend
- Rotas de shifts reordenadas: fixas antes de `{id}` (evita conflito com `/bulk`, `/reset`)
- Sessões OAuth standardizadas para 30 dias
- `DemoAuthRequest` removido (classe sem endpoint)
- `requirements.txt`: removidos boto3, jq, docxtpl, docx2pdf, pandas, numpy (não usados)
- Sub-recursos de ocorrências (`persons`, `photos`) validam `user_id`
- `/api/cleanup/all-data` apaga apenas dados do utilizador autenticado
- `/api/auth/me` usa `UserPublic` (sem expor `password_hash`)
- `get_current_user` e `logout`: Authorization header tem prioridade sobre cookie (fix de segurança — cookie do cliente partilhado não deve silenciar o token explícito)
- Cookies auth unificados: `_cookie_flags()` deteta `ENVIRONMENT=production` → `secure=True, samesite=none`; dev → `secure=False, samesite=lax`
- **Testes automatizados** (17/17 passam): `backend/tests/test_auth.py` (11 testes) + `backend/tests/test_user_isolation.py` (6 testes); MongoDB real via `pytest.ini asyncio_mode=auto`
- **Índices MongoDB** corrigidos no startup: `users.email` (unique), `user_sessions.session_token` (unique), `shifts(user_id+date)`, `occurrences.user_id`, `gratifications(user_id+date)`, etc. (anteriores apontavam para coleção errada `db.sessions`)
- **Persistência de `cycles` e `gratifiedEntries`**: `fetchCycles`/`fetchGratifiedEntries` agora chamados após login/register/session exchange em `authStore.ts`; `clearSyncedCollections` limpa também `cycles` e `gratifiedEntries`; novos endpoints `POST /cycles/reset`, `POST /gratified-entries/reset`, `POST /occurrences/reset` para apagar dados do utilizador; reset actions em `dataStore.ts` agora chamam a API em vez de só limpar localmente

### Frontend
- `sharp` removido de `package.json`; `package-lock.json` regenerado e sincronizado
- `frontend/tsconfig.json`: `strict: true` sem override `noImplicitAny: false` (foi workaround temporário; agora removido)
- `frontend/src/store/dataStore.ts`: migrado de `create<any>` para `create<DataStore>` com interface totalmente tipada
- `frontend/src/services/api.ts`: todas as funções tipadas (Occurrence, Shift, Gratification); `updateShiftTypeApi` adicionado
- `frontend/app/(tabs)/ocorrencias.tsx`: reduzido de ~1500 para ~650 linhas
  - `PersonFormModal` extraído para `frontend/src/components/occurrence/PersonFormModal.tsx`
  - `CreateOccurrenceModal` extraído para `frontend/src/components/occurrence/CreateOccurrenceModal.tsx`
- **Calendário UX redesenhado** (`frontend/app/(tabs)/index.tsx`):
  - `ShiftTypePicker`: máquina de estados `list → selected → edit/create` com edição inline de tipos
  - `DayShiftEditor` (novo): bottom-sheet para editar turno num dia específico (tipo, hora, nota)
  - `PaintModeBar` (novo): barra animada slide-up para pintar dias rapidamente
  - Botão lápis no cabeçalho ativa modo paint; `updateShiftType` no store
- `frontend/src/store/dataStore.ts`: `updateShiftType` adicionado com optimistic update + sync API

### CI/CD
- Workflow `.github/workflows/deploy.yml` usa `npm ci`, lint, `npx tsc --noEmit`, build web como checks bloqueantes
- Deploy Vercel via `npx vercel@latest` a partir da raiz do repo (não da pasta `frontend/`)
- Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` configurados no GitHub

## Pendentes / próximos passos recomendados

### Baixa prioridade
- **PDF melhorado**: endpoint atual gera PDF mínimo em memória. Se precisar de layout oficial, criar `backend/reporting/` com `docxtpl` + LibreOffice.

## Notas importantes

- Branch ativa é `master`, não `main`
- `shiftTypes` e `cycles` são locais (não estão em MongoDB)
- A app corre como web (Vercel) e mobile (Expo Go)
- Não reverter commits sem confirmar com o utilizador
