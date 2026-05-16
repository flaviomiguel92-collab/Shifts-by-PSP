# Handoff para Claude

Este ficheiro resume o estado atual do projeto para que qualquer assistente consiga continuar sem perder contexto.

## Estado atual

- Branch local/remota: `master`
- Repositório remoto: `origin` em `https://github.com/flaviomiguel92-collab/Shifts-by-PSP.git`
- Working tree limpo após último push
- Último commit: `4b625a7 refactor: audit fixes — security, typing, component extraction`

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
- `/api/reports/generate` exige autenticação (Bearer token)
- Rotas de shifts reordenadas: fixas antes de `{id}` (evita conflito com `/bulk`, `/reset`)
- Sessões OAuth standardizadas para 30 dias
- `DemoAuthRequest` removido (classe sem endpoint)
- `requirements.txt`: removidos boto3, jq, docxtpl, docx2pdf, pandas, numpy (não usados)
- Sub-recursos de ocorrências (`persons`, `photos`) validam `user_id`
- `/api/cleanup/all-data` apaga apenas dados do utilizador autenticado
- `/api/auth/me` usa `UserPublic` (sem expor `password_hash`)

### Frontend
- `sharp` removido de `package.json`; `package-lock.json` regenerado e sincronizado
- `frontend/tsconfig.json`: `strict: true` sem override `noImplicitAny: false` (foi workaround temporário; agora removido)
- `frontend/src/store/dataStore.ts`: migrado de `create<any>` para `create<DataStore>` com interface totalmente tipada
- `frontend/src/services/api.ts`: todas as funções tipadas (Occurrence, Shift, Gratification)
- `frontend/app/(tabs)/ocorrencias.tsx`: reduzido de ~1500 para ~650 linhas
  - `PersonFormModal` extraído para `frontend/src/components/occurrence/PersonFormModal.tsx`
  - `CreateOccurrenceModal` extraído para `frontend/src/components/occurrence/CreateOccurrenceModal.tsx`

### CI/CD
- Workflow `.github/workflows/deploy.yml` usa `npm ci`, lint, `npx tsc --noEmit`, build web como checks bloqueantes
- Deploy Vercel via `npx vercel@latest` a partir da raiz do repo (não da pasta `frontend/`)
- Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` configurados no GitHub

## Pendentes / próximos passos recomendados

### Alta prioridade
- **Índices MongoDB**: adicionar índices em `user_id`, `date`, `email`, `session_token` no `server.py`
  ```python
  await db.sessions.create_index("token", unique=True)
  await db.shifts.create_index([("user_id", 1), ("date", 1)])
  await db.occurrences.create_index("user_id")
  ```

- **Persistência de `cycles` e `gratifiedEntries`**: atualmente vivem só no localStorage do frontend. Considerar mover para MongoDB tal como shifts/gratifications.

### Média prioridade
- **Cookies auth inconsistentes**: login/register criam cookie sem `secure`/`samesite`; `/auth/session` usa `secure=True, samesite='none'`; o frontend usa Bearer token. Unificar para Bearer-only ou corrigir flags dos cookies.

- **Testes automatizados** (nenhum existe atualmente):
  - auth (register, login, logout, token expirado)
  - cleanup por utilizador (não apagar dados de outros)
  - isolamento de ocorrências por `user_id`
  - `/api/reports/generate`

### Baixa prioridade
- **PDF melhorado**: endpoint atual gera PDF mínimo em memória. Se precisar de layout oficial, criar `backend/reporting/` com `docxtpl` + LibreOffice.

## Notas importantes

- Branch ativa é `master`, não `main`
- `shiftTypes` e `cycles` são locais (não estão em MongoDB)
- A app corre como web (Vercel) e mobile (Expo Go)
- Não reverter commits sem confirmar com o utilizador
