# AGENTS.md

## Objetivo

Este documento define as regras operacionais para agentes de IA que vão trabalhar neste repositório. A intenção é garantir que qualquer alteração futura respeite a arquitetura existente, as convenções de código, os limites de segurança e as dependências de negócio do produto.

A aplicação foi analisada a partir do código e da configuração existente em:
- [backend/server.py](backend/server.py)
- [backend/db.py](backend/db.py)
- [backend/auth/dependencies.py](backend/auth/dependencies.py)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- [frontend/src/services/api.ts](frontend/src/services/api.ts)
- [render.yaml](render.yaml)
- [README.md](README.md)

## Arquitectura resumida

### Backend
O backend é um serviço FastAPI em [backend/server.py](backend/server.py). O app centraliza a inicialização, segurança de resposta, CORS, middleware de request ID e inclusão de routers por domínio.

Routers principais:
- [backend/routers/auth.py](backend/routers/auth.py)
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/routers/cycles.py](backend/routers/cycles.py)
- [backend/routers/events.py](backend/routers/events.py)
- [backend/routers/gratifications.py](backend/routers/gratifications.py)
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/routers/stats.py](backend/routers/stats.py)
- [backend/routers/shift_types.py](backend/routers/shift_types.py)
- [backend/routers/misc.py](backend/routers/misc.py)

Modelos e validação:
- [backend/models](backend/models)
- [backend/config.py](backend/config.py)
- [backend/security/crypto.py](backend/security/crypto.py)

### Frontend
O frontend é uma aplicação Expo/React Native com rotas em [frontend/app](frontend/app) e stores em [frontend/src/store](frontend/src/store). A camada de dados centraliza a sincronização com a API e separa estados locais de dados autoritativos do servidor.

Arquivos centrais:
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- [frontend/src/services/api.ts](frontend/src/services/api.ts)
- [frontend/src/utils/storage.ts](frontend/src/utils/storage.ts)
- [frontend/src/theme/themes.ts](frontend/src/theme/themes.ts)

### Base de dados
A perspetiva de dados é MongoDB, acessível em [backend/db.py](backend/db.py). Os índices e a criação segura do esquema são feitos na inicialização do processo, com atenção a conflitos e duplicados.

## Regras para qualquer agente de IA

### 1) Antes de qualquer alteração
Antes de tocar em código ou documentação, o agente deve:
1. Consultar a documentação relevante em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/FEATURES.md](docs/FEATURES.md), [docs/DATABASE.md](docs/DATABASE.md), [docs/CHANGE_IMPACT.md](docs/CHANGE_IMPACT.md) e [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).
2. Identificar os ficheiros afetados e os módulos dependentes.
3. Verificar se a operação altera autenticação, isolamento por utilizador, dados sensíveis, eventos, ciclos, turnos, ocorrências ou exportações.
4. Avaliar o impacto em frontend e backend, não apenas no ficheiro que parece ter o problema.
5. Confirmar que não há uma documentação válida que esteja a ser substituída sem integração.

### 2) Convenções de código
- Não reescrever módulos sem necessidade; preferir mudanças mínimas e localizadas.
- Manter a separação entre dados “server-backed” e “local-only” no frontend, como em [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts).
- Manter a autorização pela sessão autenticada e pelo user_id do utilizador em operações sensíveis.
- Preservar naming e estrutura por domínio já usados nos routers e stores.
- Quando se alterar uma API, verificar o consumo no frontend e os efeitos nos stores e UI.
- Quando se alterar um store, verificar os consumers, nomeadamente em [frontend/app](frontend/app).

### 3) Segurança e integridade
- Nunca introduzir endpoints ou fluxos que ignorem autenticação.
- Manter o princípio de “user_id” em queries e mutations sensíveis.
- Não expor dados sensíveis em respostas públicas ou logs.
- Respeitar o comportamento de cookie vs Authorization já implementado em [backend/auth/dependencies.py](backend/auth/dependencies.py) e [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts).
- Para dados PII em ocorrências, respeitar o padrão de criptografia opcional em [backend/security/crypto.py](backend/security/crypto.py).
- Não incluir secret keys, tokens, passwords, chaves de sessão, URLs privadas ou dados reais em documentação, código, logs ou exemplos.

### 4) Testes e validação
A aplicação tem cobertura e estrutura de testes em [backend/tests](backend/tests). O agente deve preferir execução focada e pequena antes de expandir a mudança.

Comandos típicos a usar, conforme a estrutura do projeto:
- `cd backend && pytest -q`
- `cd backend && pytest backend/tests/test_auth.py -q`
- `cd backend && pytest backend/tests/test_user_isolation.py -q`

Se a alteração for de frontend, validar também:
- TypeScript / build do frontend, conforme configuração em [frontend/package.json](frontend/package.json)
- Fluxos críticos de autenticação e sincronização

### 5) Processo de alteração
Para cada alteração:
1. localizar o ponto de falha e os dependentes
2. confirmar o contrato da API / store / model
3. escrever ou adaptar testes que cubram o comportamento real
4. aplicar o patch mínimo
5. validar alvo e dependentes relevantes
6. atualizar documentação se a mudança alterar a arquitetura, fluxos ou riscos

### 6) Não fazer
- Não alterar funcionalidade sem antes consultar a documentação relevante e os ficheiros afetados.
- Não remover documentação válida sem a integrar ao novo contexto.
- Não criar “hardcoded secrets” ou exemplos com dados reais.
- Não alterar a estrutura de persistência sem avaliar impactos em [docs/DATABASE.md](docs/DATABASE.md) e [docs/CHANGE_IMPACT.md](docs/CHANGE_IMPACT.md).
- Não ignorar problemas de autenticação, autorização ou user isolation.

## Pontos críticos conhecidos
Estas áreas exigem atenção especial:
- autenticação e sessão em [backend/auth/dependencies.py](backend/auth/dependencies.py)
- isolamento de utilizadores em [backend/routers/occurrences.py](backend/routers/occurrences.py) e [backend/routers/shifts.py](backend/routers/shifts.py)
- sincronização de estado em [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- gestão de ocorrências com fotos e PII em [backend/routers/occurrences.py](backend/routers/occurrences.py)
- deploy e ambiente em [render.yaml](render.yaml), [backend/Dockerfile](backend/Dockerfile) e [README.md](README.md)

## Ponto de incerteza
Algumas áreas continuam sem validação a nível de execução completa do projeto. Sempre que a análise documentada não estiver completamente confirmada por testes ou execução real, o agente deve assinalar essa limitação e procurar prova no código ou na configuração antes de afirmar que a funcionalidade está concluída.

## Referência rápida
- App entry: [backend/server.py](backend/server.py)
- DB lifecycle: [backend/db.py](backend/db.py)
- Frontend auth: [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- Frontend data: [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- API client: [frontend/src/services/api.ts](frontend/src/services/api.ts)
- Docs base: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
