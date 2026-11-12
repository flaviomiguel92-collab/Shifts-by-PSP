# Mapa de dependências e impactos de alterações

## Objetivo

Este documento identifica os pontos do sistema que são mais sensíveis a regressões quando uma alteração é feita. A intenção é orientar uma avaliação de impacto antes de escrever qualquer patch.

## Áreas com maior acoplamento

### 1. Autenticação e sessão
Ficheiros centrais:
- [backend/auth/dependencies.py](backend/auth/dependencies.py)
- [backend/routers/auth.py](backend/routers/auth.py)
- [backend/server.py](backend/server.py)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/src/utils/storage.ts](frontend/src/utils/storage.ts)

Impactos possíveis:
- utilizador bloqueado ou session inválida
- logout espontâneo
- perda de estado do cliente
- acesso indevido em endpoints protegidos

### 2. Isolamento por user_id
Ficheiros centrais:
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/routers/gratifications.py](backend/routers/gratifications.py)
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/routers/events.py](backend/routers/events.py)
- [backend/models](backend/models)

Impactos possíveis:
- leitura ou escrita de dados de outro utilizador
- expressão errada de integraidade de dados por owner
- inconsistência entre UI e dados do servidor

### 3. Estado global do frontend
Ficheiros centrais:
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/src/services/api.ts](frontend/src/services/api.ts)

Impactos possíveis:
- dados locais divergentes do servidor
- ecrãs com informação desatualizada
- falhas de sincronização após login/logout
- reset de dados incompleto

### 4. Calendário e turnos
Ficheiros centrais:
- [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx)
- [frontend/src/components](frontend/src/components)
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/models/shifts.py](backend/models/shifts.py)

Impactos possíveis:
- mudança na estrutura de turno e quebra de UI
- problemas de recarga por mês
- inconsistência no calendário e no resumo de turnos

### 5. Ocorrências e PII
Ficheiros centrais:
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/security/crypto.py](backend/security/crypto.py)
- [frontend/app/(tabs)/ocorrencias.tsx](frontend/app/(tabs)/ocorrencias.tsx)

Impactos possíveis:
- vazamento de dados pessoais
- falha de desencriptação / compatibilidade de legado
- perda de fotos ou metadados
- quebra de geração de relatórios PDF

### 6. Exportações e PDF
Ficheiros centrais:
- [frontend/src/utils/exportUtils.ts](frontend/src/utils/exportUtils.ts)
- [backend/Dockerfile](backend/Dockerfile)
- [README.md](README.md)
- [backend/server.py](backend/server.py)

Impactos possíveis:
- falha em ambiente sem LibreOffice
- geração de relatório incompleta
- dependência do runtime externo no deploy

## Mapa de dependências por tipo de alteração

### Alterações em autenticação
Devem ser rastreadas em:
- backend auth
- frontend authStore
- storage utilities
- qualquer consumidor de `session_token`
- endpoints com `user_id`

### Alterações em dados de calendário
Devem ser rastreadas em:
- shifts router
- dataStore
- index.tsx
- tipos e helpers de calendário
- stats e gratifications quando os cálculos dependem dos turnos

### Alterações em ocorrências
Devem ser rastreadas em:
- occurrences router
- crypto module
- occurrence types
- UI de ocorrências
- export generation

### Alterações em base de dados
Devem ser rastreadas em:
- [backend/db.py](backend/db.py)
- [backend/models](backend/models)
- routers afetados
- tests dos domínios alterados

## Riscos de regressão por categoria

### Segurança
- qualquer alteração em autenticação, sessão ou filtros `user_id`
- qualquer alteração em endpoints de reset e cleanup
- qualquer alteração em regras de acesso para documentos sensíveis

### Produto
- mudança na UX de calendário
- alteração em cálculos de gratificações
- mudança na forma de guardar ou exportar ocorrências

### Infraestrutura
- alterações em env vars
- alterações em deploy / Docker / Render
- alterações em caminhos do frontend/backend

## Checklist para qualquer alteração futura

Antes de alterar o código, o agente deve verificar:
1. Se a mudança toca em autenticação, tenho de rever login/logout/session validation.
2. Se a mudança toca em dados do utilizador, tenho de rever `user_id` e isolamento.
3. Se a mudança toca em store, tenho de rever API e UI que consomem esse store.
4. Se a mudança toca em schema Mongo, tenho de rever as regras de startup e índice.
5. Se a mudança toca em exportação/relatórios, tenho de rever a dependência externa de PDF.
6. Se a mudança altera comportamento visível, tenho de rever documentação e testes.

## Pontos ainda não verificados

- O grau exato de acoplamento em alguns componentes do frontend e utilitários ainda não foi validado através de execução end-to-end completa.
- A arquitetura de deploy e o comportamento em produção em cenários específicos de ausência de `LIBREOFFICE_BIN` ou `MONGO_URL` não foram validados neste estudo.
- Não foi realizada uma auditoria completa de todos os endpoints em modo execução, por isso alguns impactos só podem ser inferidos a partir do código e da configuração.
