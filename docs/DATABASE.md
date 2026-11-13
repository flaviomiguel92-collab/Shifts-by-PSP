# Base de dados e estrutura de dados

## Visão geral

A aplicação usa MongoDB como base de dados principal, com acesso assíncrono via Motor em [backend/db.py](backend/db.py). O ciclo de vida da aplicação inicializa a conexão e garante índices de forma idempotente, evitando destruição de índices em startup normal.

## Conexão e inicialização

### Ficheiros centrais
- [backend/db.py](backend/db.py)
- [backend/config.py](backend/config.py)
- [backend/server.py](backend/server.py)

### Regra de startup
No [backend/db.py](backend/db.py), o código:
- lê `MONGO_URL` da variável de ambiente
- usa `DB_NAME` com default `shiftextra_db`
- inicializa `AsyncIOMotorClient`
- cria índices seguros na startup
- em `RUN_INDEX_MIGRATION=1` pode seguir uma rota de migração mais agressiva

## Coleções e índices principais

### users
Foco: utilizadores autenticados.

Índice principal:
- `email` com `unique=True`

Na lógica de startup a aplicação também remove duplicados por email antes de criar o índice único, em [backend/db.py](backend/db.py).

### user_sessions
Foco: sessões autenticadas.

Índice principal:
- `session_token` com `unique=True`

### shifts
Foco: turnos atribuídos por data.

Índice principal:
- `[('user_id', 1), ('date', 1)]` com `unique=True`

### occurrences
Foco: ocorrências e dados relacionados.

As fotografias da ocorrência e das pessoas estão embutidas neste documento, em arrays `photos`. Novas gravações normalizam imagens JPEG, PNG, GIF e WebP para data URIs base64 validados e sem metadados EXIF. Leituras continuam compatíveis com base64 antigo sem prefixo. Remover uma fotografia substitui o array; eliminar a ocorrência elimina os dados embutidos, sem armazenamento de ficheiros separado ou migração de esquema.

Índice principal:
- `user_id`

### gratifications
Foco: gratificações do utilizador.

Índice principal:
- `[('user_id', 1), ('date', 1)]`

### shift_types
Foco: tipos de turno personalizados.

Índice principal:
- `user_id`

### cycles
Foco: ciclos de calendário.

Índice principal:
- `user_id`

### gratified_entries
Foco: entradas no calendário de gratificados.

Índice principal:
- `[('user_id', 1), ('date', 1)]`

### events
Foco: eventos do calendário.

Índice principal:
- `[('user_id', 1), ('date', 1)]`

### audit_logs
Foco: registo de auditoria.

Índice principal:
- `[('user_id', 1), ('ts', -1)]`

## Modelo de domínio

### Autenticação
- [backend/models/auth.py](backend/models/auth.py)

Modelos e regras sensíveis:
- User
- UserSession
- RegisterRequest
- LoginRequest

Pontos relevantes:
- validação de password forte
- sessão com vínculo do user_id
- tokens de sessão associados ao utilizador

### Turnos, ciclos e eventos
- [backend/models/shifts.py](backend/models/shifts.py)
- [backend/models/cycles.py](backend/models/cycles.py)
- [backend/models/events.py](backend/models/events.py)

Observações:
- a grande maioria dos documentos dependem de `user_id`
- datas e tipos de turno são centrais para o calendário
- a combinação user_id + date é uma regra relevante de integridade

### Gratificações
- [backend/models/gratifications.py](backend/models/gratifications.py)

Observações:
- há um domínio de gratificações e outro de entradas de gratificados
- essa duplicidade é considerada no frontend em [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)

### Ocorrências
- [backend/models/occurrences.py](backend/models/occurrences.py)
- [backend/security/crypto.py](backend/security/crypto.py)

Observações:
- há dados sensíveis de pessoa e PII
- o módulo de criptografia encripta apenas quando a variável de ambiente `PII_ENC_KEY` está definida
- o módulo tolera leitura tanto de dados em texto claro como cifrados

## Regras de integridade

### Isolamento por utilizador
A regra mais importante do projeto é o isolamento por `user_id`. Em praticamente todos os módulos de domínio, queries e mutações devem respeitar o owner do documento.

Isso é visível em:
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/routers/gratifications.py](backend/routers/gratifications.py)
- [backend/routers/events.py](backend/routers/events.py)
- [backend/routers/shift_types.py](backend/routers/shift_types.py)

### Regras de unicidade
- email de utilizador único
- token de sessão único
- combinação user_id + date em pontos de domínio temporais

### Proteção de dados PII
- as ocorrências têm dados sensíveis que podem ser encriptados em armazenamento opcional
- a política do código permite compatibilidade com dados legados em texto claro

## Migrações e manutenção

### Startup-safe migrations
A lógica em [backend/db.py](backend/db.py) evita drops indiscriminados em startup normal. O comportamento é explicitamente seguro e destinado a ambientes de produção.

### Migration mode explícito
Quando `RUN_INDEX_MIGRATION=1` está ativado, o código pode:
- deduplicar `users` por email
- reconstruir índices com conflitos

A documentação do código indica que esta rota deve ser usada com cuidado e nunca permanecer em produção.

## Pontos ainda não verificados

- Não foi validada a existência de migrações formais fora do startup de índices.
- O modelo final de coleções e campos em alguns subconjuntos de dados pode exigir validação contínua em produção, especialmente em ocorrências e gratificados.
- O grau de normalização e evolução do schema em dados locais do frontend não foi objeto de migração formal no backend; a persistência local foi tratada no cliente.
