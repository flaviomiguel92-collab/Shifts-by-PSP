# Arquitetura da aplicação

## Visão geral

A aplicação está organizada em dois grandes blocos:

- Backend em Python/FastAPI, responsável por autenticação, regras de negócio e persistência em MongoDB.
- Frontend em Expo/React Native, responsável pela interface, navegação e sincronização com a API.

As entradas principais do sistema são:
- [backend/server.py](backend/server.py)
- [frontend/app/_layout.tsx](frontend/app/_layout.tsx)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)

## Stack tecnológica confirmada

### Backend
Confirmado por [backend/pyproject.toml](backend/pyproject.toml), [backend/server.py](backend/server.py) e imports do código.

- Python 3.x
- FastAPI
- Pydantic
- Motor / PyMongo para MongoDB
- Passlib e bcrypt para autenticação
- SlowAPI para rate limiting
- python-dotenv para variáveis de ambiente
- cryptography para encriptação opcional de PII
- Sentry opcional via variável de ambiente

### Frontend
Confirmado por [frontend/package.json](frontend/package.json) e código do diretório [frontend/src](frontend/src).

- Expo / React Native
- Expo Router
- Zustand
- AsyncStorage / localStorage
- componentização por telas e módulos
- react-native-web para suporte web
- xlsx e exportação de dados
- react-native-gifted-charts para estatísticas

### Infraestrutura e deploy
Confirmado por [render.yaml](render.yaml), [backend/Dockerfile](backend/Dockerfile), [frontend/vercel.json](frontend/vercel.json) e [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

- Backend em Render via Docker
- Frontend em Vercel
- PDF/report generation com LibreOffice / soffice
- MongoDB externo via variável de ambiente

## Estrutura de diretórios

### Backend
- [backend/server.py](backend/server.py): bootstrap da app FastAPI
- [backend/config.py](backend/config.py): env, CORS, rate limit, validações de formato
- [backend/db.py](backend/db.py): ligação MongoDB, indexes e lifespan
- [backend/auth](backend/auth): autenticação e dependências
- [backend/models](backend/models): schemas Pydantic
- [backend/routers](backend/routers): endpoints por módulo
- [backend/security](backend/security): encriptação opcional e utilitários
- [backend/tests](backend/tests): testes automatizados

### Frontend
- [frontend/app](frontend/app): rotas e páginas da UI
- [frontend/src/store](frontend/src/store): estado global e sincronização
- [frontend/src/services](frontend/src/services): camada HTTP
- [frontend/src/components](frontend/src/components): blocos visuais reutilizáveis
- [frontend/src/types](frontend/src/types): tipos TypeScript
- [frontend/src/utils](frontend/src/utils): helpers, exportação, calendário, storage
- [frontend/src/theme](frontend/src/theme): tema visual

## Módulos de negócio do backend

### Auth
A lógica principal de autenticação está em:
- [backend/auth/dependencies.py](backend/auth/dependencies.py)
- [backend/routers/auth.py](backend/routers/auth.py)
- [backend/models/auth.py](backend/models/auth.py)

Responsabilidades:
- criação de utilizadores
- login/logout
- validação de sessão
- autenticação por Authorization header e compatibilidade com cookies
- gestão de sessões e endpoint de perfil

### Shifts
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/models/shifts.py](backend/models/shifts.py)

Responsabilidades:
- turnos
- bulk upsert
- atualização e remoção
- regra de isolamento por utilizador

### Shift types
- [backend/routers/shift_types.py](backend/routers/shift_types.py)
- [backend/models/shift_types.py](backend/models/shift_types.py)

Responsabilidades:
- tipos de turno e configuração por utilizador

### Cycles
- [backend/routers/cycles.py](backend/routers/cycles.py)
- [backend/models/cycles.py](backend/models/cycles.py)

Responsabilidades:
- ciclos de trabalho
- padrões recorrentes no calendário

### Events
- [backend/routers/events.py](backend/routers/events.py)
- [backend/models/events.py](backend/models/events.py)

Responsabilidades:
- eventos do calendário
- data e owner por utilizador

### Gratifications
- [backend/routers/gratifications.py](backend/routers/gratifications.py)
- [backend/models/gratifications.py](backend/models/gratifications.py)

Responsabilidades:
- registo de gratificações
- entradas por data
- cálculos relacionados ao calendário de gratificados

### Occurrences
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/models/occurrences.py](backend/models/occurrences.py)
- [backend/security/crypto.py](backend/security/crypto.py)

Responsabilidades:
- ocorrências e pessoas envolvidas
- upload e compressão de imagens
- sanitização de EXIF
- PII opcionalmente encriptada
- regras de isolamento por user_id

### Stats
- [backend/routers/stats.py](backend/routers/stats.py)

Responsabilidades:
- agregações mensal/anual
- comparação e dashboard analytics

## Módulos do frontend

### Estado global
Os stores-chave são:
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts): sessão e autenticação
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts): dados da aplicação e sincronização
- [frontend/src/store/preferencesStore.ts](frontend/src/store/preferencesStore.ts): preferências visuais e de UX
- [frontend/src/store/paintStore.ts](frontend/src/store/paintStore.ts): modo pintura no calendário

### API client
- [frontend/src/services/api.ts](frontend/src/services/api.ts)

Este módulo centraliza o acesso à API e empacota os endpoints em funções de alto nível. A lógica de autenticação e integração segue o padrão de Authorization Bearer token com fallback em cookies conforme validado no frontend e backend.

### Screens e rotas
- [frontend/app/_layout.tsx](frontend/app/_layout.tsx): bootstrap da app e validação inicial
- [frontend/app/login.tsx](frontend/app/login.tsx)
- [frontend/app/register.tsx](frontend/app/register.tsx)
- [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx)
- [frontend/app/(tabs)/gratificados.tsx](frontend/app/(tabs)/gratificados.tsx)
- [frontend/app/(tabs)/ocorrencias.tsx](frontend/app/(tabs)/ocorrencias.tsx)
- [frontend/app/(tabs)/stats.tsx](frontend/app/(tabs)/stats.tsx)
- [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx)

## Fluxo de dados principal

### Fluxo de autenticação
O layout usa rotas protegidas e um ecrã de recuperação (`frontend/app/session.tsx`) durante o restauro. O serviço `frontend/src/services/session.ts` serializa alterações ao token e notifica o store quando a sessão atual é invalidada. O cliente HTTP verifica a sessão associada às respostas antes de entregar dados aos consumidores. Falhas temporárias preservam as credenciais e permitem repetir a validação; apenas uma validação bem-sucedida recupera o perfil num arranque novo. O carregamento dos dados é independente da apresentação das rotas autenticadas.

1. O frontend tenta ler o token em [frontend/src/utils/storage.ts](frontend/src/utils/storage.ts).
2. [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts) chama o endpoint `/api/auth/me`.
3. O backend valida a sessão em [backend/auth/dependencies.py](backend/auth/dependencies.py).
4. Se a sessão for válida, o utilizador é colocado no estado e os dados do utilizador são carregados.
5. Em caso de 401, efetua limpeza local e sessão inválida.

### Fluxo de sincronização de dados
1. O store master [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts) separa coleções locais e server-backed.
2. No login, o código recarrega dados principais e sincroniza ciclos, eventos e entradas de gratificados.
3. [frontend/src/services/api.ts](frontend/src/services/api.ts) dispara chamadas HTTP com autorização.
4. O backend valida owner via user_id e responde com documentos pertencentes ao utilizador atual.

### Fluxo de calendário
O calendário central em [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx) usa stores e componentes do diretório [frontend/src/components](frontend/src/components). O processo principal é:
- selecionar data
- editar ou criar turno
- aplicar tipo de turno e hora
- sincronizar com API
- persistir ordem e estado no store local

## Segurança aplicada pela arquitetura

### Backend
O backend aplica:
- CORS em [backend/server.py](backend/server.py)
- headers de segurança e X-Request-ID
- rate limiting em [backend/config.py](backend/config.py)
- autenticação obrigatória em endpoints sensíveis
- validações por user_id
- fallback de cookie + Authorization em autenticação

### Frontend
O frontend:
- guarda o token em storage compatível web/nativo
- usa sempre o token em headers do tipo Authorization: Bearer
- limpa os dados sincronizados em logout ou invalid token

## Dependências críticas

- [backend/db.py](backend/db.py) define os índices e a regra de startup.
- [backend/config.py](backend/config.py) valida data, mês e ambiente.
- [backend/server.py](backend/server.py) define middleware de segurança e rotas.
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts) define o contrato entre cliente e backend.
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts) decide a sessão do utilizador e o carregamento inicial.

## Pontos ainda não verificados

- A execução completa de todos os fluxos de UI não foi validada em runtime neste ciclo de análise.
- Alguns componentes de UI e modais específicos, embora incorporados no sistema, ainda não foram validados em detalhe por testes end-to-end.
- O estado exato de todos os endpoints de exportação e PDF pode exigir validação em ambiente com LibreOffice disponível.
- Algumas áreas de integração foram inferidas a partir do código e configuração, e não por execução real ao longo de todo o sistema.
