# Roadmap técnico e de produto — Shift Olama / Shifts-by-PSP

Documento de trabalho gerado a partir da auditoria CTO do repositório. Usar como checklist ao retomar o projeto.

---

## Contexto rápido

- **Stack**: Expo (web/mobile) + FastAPI + MongoDB (Motor); PDF via LibreOffice (Docker).
- **Pastas principais**: `frontend/`, `backend/`, `render.yaml`, `backend/Dockerfile`.
- **Risco global**: corrigir **segurança na API** (autorização consistente, endpoints sensíveis) antes de escalar utilizadores ou dados sensíveis.

---

## Top 5 prioridades (resumo)

1. Auth + `user_id` em **todas** as mutações (incl. `persons`/`photos` em ocorrências).
2. Eliminar ou bloquear `POST /api/cleanup/all-data` em produção.
3. Proteger `POST /api/reports/generate` e `GET /api/reports/templates` (auth + rate limit).
4. Corrigir IDOR nos `update_one` de shifts e gratifications (filtro com dono).
5. Testes automatizados mínimos + CI (GitHub Actions a criar).

**Referência de código**: `backend/server.py` (monólito principal).

---

## Fase 0 — Correções críticas antes de continuar

**Objetivo**: Fechar buracos que apagam ou alteram dados de terceiros / todos os utilizadores.

| Prioridade | Tarefa principal | Ficheiros / áreas |
|------------|------------------|-------------------|
| P0 | Remover ou proteger `cleanup/all-data` (admin + secret, só staging). | `backend/server.py` |
| P0 | Autenticação + filtro `user_id` em add/remove person e photos em ocorrências. | `backend/server.py` (~989+) |
| P0 | Incluir `user_id` no filtro do `update_one` em `update_shift` e `update_gratification`. | `backend/server.py` (~533, ~676) |
| P0 | Auth obrigatório em geração de relatórios PDF + limitação de taxa. | `backend/server.py` (~1094+) |

**Risco se não fizer**: incidente de integridade / RGPD; wipe total da BD em produção.

**Dificuldade**: baixa–média | **Impacto**: máximo

---

## Fase 1 — Estabilização técnica

**Objetivo**: Comportamento previsível e regressões detectáveis.

- Pytest (ou estruturar `backend_test.py`) para auth, isolamento por utilizador, bulk shifts.
- Logging estruturado (request id); evitar PII em logs de erro.
- Documentar variáveis de ambiente (sem segredos): `MONGO_URL`, `DB_NAME`, `LIBREOFFICE_BIN`, `PORT`, URLs frontend para CORS.
- Alinhar **gratificações API** vs **gratifiedEntries** locais no frontend (`dataStore.ts`, `gratificados.tsx`).
- Ligar `updateGratification` no store ao `PUT` da API ou remover edição inconsistente.

**Dificuldade**: média | **Impacto**: alto

---

## Fase 2 — Produto mínimo sólido

**Objetivo**: Produto coerente para o utilizador.

- Decisão de produto: unificar modelo de gratificações **ou** UX explícita “local vs servidor”.
- Paginação ou limites claros em listas grandes (`to_list(1000)` no backend).
- Limites de tamanho de payload / fotos base64 (Mongo).
- Índices Mongo: `user_id`, `date`, `id` onde faltar.

**Dificuldade**: média | **Impacto**: médio–alto

---

## Fase 3 — Escalabilidade e automação

**Objetivo**: Custo e performance sob mais carga.

- Armazenamento de ficheiros (S3-compatível) para fotos em vez de só base64 no documento.
- `bulk_write` no Mongo para `/shifts/bulk` em ranges grandes.
- CI/CD: lint + testes em PR (`.github/workflows/` — ainda não existe no repo).
- Ambiente staging opcional.

**Dificuldade**: alta | **Impacto**: alto em escala

---

## Fase 4 — Crescimento e otimização

**Objetivo**: Equipa e compliance.

- Modularizar `server.py` em routers por domínio.
- Refatorar `frontend/app/(tabs)/index.tsx` (componentes/hooks menores).
- RGPD: retenção, export, eliminação de conta.
- Backups testados, runbook de rollback, monitorização (Sentry/Datadog/etc.).

**Dificuldade**: alta | **Impacto**: médio–alto (longo prazo)

---

## Plano de ação — próximos 7 dias (sugestão)

| Dia | Foco |
|-----|------|
| **1** | Inventário de rotas em `server.py`: auth sim/não; lista de gaps. |
| **2** | Patch segurança P0: cleanup, reports, persons/photos, updates com `user_id`. |
| **3** | Rate limit mínimo em `/reports/generate`; testes manuais com 2 contas. |
| **4** | Primeiros testes automatizados (auth + recurso alheio → 403/404). |
| **5** | Frontend: gratificações/store consistentes; mensagens de produto. |
| **6** | Índices Mongo + limites de body/tamanho. |
| **7** | README/runbook deploy, backup, revisão `requirements.txt` (deps não usadas). |

---

## Backlog priorizado

### [P0] — Crítico

- **Fechar superfície destrutiva e IDOR**  
  - **Porquê**: dados de todos ou de outros utilizadores em risco.  
  - **Onde**: `backend/server.py`.  
  - **Aceitação**: nenhuma mutação sem dono autenticado; cleanup inexistente ou só admin com secret.

- **Autenticar sub-rotas de ocorrências (persons, photos)**  
  - **Aceitação**: 401 sem token; recurso de outro `user_id` inacessível.

### [P1] — Importante

- **Proteger geração de PDF / templates**  
  - **Aceitação**: utilizador autenticado + limite de taxa razoável.

- **Corrigir updates Mongo que filtram só por `id`** (shifts, gratifications)  
  - **Aceitação**: update só se documento pertencer ao `user_id` da sessão.

### [P2] — Útil

- **Testes + CI**  
  - **Aceitação**: pipeline corre em cada PR.

### [P3] — Melhoria futura

- **Dividir `index.tsx` e `server.py`** por módulos/manutenção.

---

## Notas adicionais

- **Deploy backend**: `render.yaml` (Docker + LibreOffice). Variáveis sensíveis tipicamente no dashboard Render.
- **Deploy frontend**: Vercel; `frontend/vercel.json` para SPA refresh (fallback `index.html`).
- **Testes existentes**: `backend/test_report_pdf.py`, `backend_test.py` na raiz; avaliar migração para `pytest` em `backend/tests/`.

---

*Última atualização: alinhada com a auditoria CTO do repositório (estrutura e `server.py` analisados). Ajustar datas e owners quando a equipa retomar.*
