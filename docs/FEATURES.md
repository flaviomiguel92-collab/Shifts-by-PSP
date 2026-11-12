# Inventário de funcionalidades

## 1. Autenticação e sessão

### Implementação principal
- [backend/routers/auth.py](backend/routers/auth.py)
- [backend/auth/dependencies.py](backend/auth/dependencies.py)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [frontend/app/login.tsx](frontend/app/login.tsx)
- [frontend/app/register.tsx](frontend/app/register.tsx)

### Funcionalidades
- Registo de utilizador
- Login com validação de password
- Logout
- Consulta de perfil atual
- Gestão de sessões por utilizador
- Eliminação de conta
- Persistência de sessão em storage do cliente
- Verificação automática de autenticação na inicialização

### Comportamentos observados
- O frontend valida a password antes do envio para a API.
- A sessão é guardada em storage compatível com web e native em [frontend/src/utils/storage.ts](frontend/src/utils/storage.ts).
- O backend usa Authorization header como fonte prioritária e cookie como fallback, conforme [backend/auth/dependencies.py](backend/auth/dependencies.py).
- O logout limpa o token local e sincroniza a limpeza dos dados server-backed.

## 2. Calendário e gestão de turnos

### Implementação principal
- [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)
- [backend/routers/shifts.py](backend/routers/shifts.py)
- [backend/models/shifts.py](backend/models/shifts.py)

### Funcionalidades
- Visualização por mês
- Criação, edição e remoção de turnos
- Recolha de dados por dia e tipo de turno
- Bulk upsert de turnos
- Gestão de tipos de turno
- Modo paint para aplicar padrões rapidamente
- Editor de turno por dia
- Aplicação de ciclos recorrentes ao calendário

### Comportamentos observados
- O store separa dados locais de dados server-backed.
- O calendário usa um editor de turno por dia e uma picker de tipos de turno.
- O store implementa atualizações optimistas e sync com a API em [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts).
- A API aceita operação em lote para reduzir chamadas em períodos de edição massiva.

## 3. Tipos de turno e ciclos

### Implementação principal
- [backend/routers/shift_types.py](backend/routers/shift_types.py)
- [backend/routers/cycles.py](backend/routers/cycles.py)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)

### Funcionalidades
- Definição de tipos de turno por utilizador
- Criação/edição/remoção de tipos de turno
- Criação de ciclos com padrões
- Aplicação de ciclos ao calendário
- Persistência de configurações de ciclos por utilizador

### Observações
- Os ciclos e shift types são tratados como entidades com relação ao user_id; os dados são isolados por utilizador.
- O frontend persiste alguns dados locais e também sincroniza com o backend conforme a lógica de [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts).

## 4. Gratificações

### Implementação principal
- [backend/routers/gratifications.py](backend/routers/gratifications.py)
- [frontend/app/(tabs)/gratificados.tsx](frontend/app/(tabs)/gratificados.tsx)
- [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)

### Funcionalidades
- Registo de gratificações
- Cálculo por mês e ano
- Listagem e resumo do utilizador
- Modelos e templates configuráveis
- Exportação de dados em formatos de análise e relatório

### Comportamentos observados
- O estado de gratificados é tipado e separado em coleções locais e server-backed.
- Há diferenciação entre configurações locais e entradas vindas do backend.
- Existem operações de reset e limpeza dedicadas dentro do store.

## 5. Ocorrências

### Implementação principal
- [backend/routers/occurrences.py](backend/routers/occurrences.py)
- [backend/models/occurrences.py](backend/models/occurrences.py)
- [frontend/app/(tabs)/ocorrencias.tsx](frontend/app/(tabs)/ocorrencias.tsx)
- [frontend/src/types/occurrence.ts](frontend/src/types/occurrence.ts)

### Funcionalidades
- Criação e gestão de ocorrências
- Atribuição de pessoas envolvidas
- Upload e manipulação de fotos
- Compressão de imagens
- Remoção de EXIF
- Estado de ocorrência
- Document generation / PDF
- Gestão por user_id

### Comportamentos observados
- O código trata fotos e pessoas como dados sensíveis.
- Há suporte opcional de encriptação para PII em [backend/security/crypto.py](backend/security/crypto.py).
- O backend sanitiza imagens de forma defensiva antes de persistir.

## 6. Estatísticas e analytics

### Implementação principal
- [backend/routers/stats.py](backend/routers/stats.py)
- [frontend/app/(tabs)/stats.tsx](frontend/app/(tabs)/stats.tsx)

### Funcionalidades
- estatísticas mensais
- estatísticas anuais
- dashboard de comparações
- dados por período para calendário e turnos

### Observações
- O analytics do backend e o frontend parecem estar ligados a valores agregados e resultados por período e user_id.
- A camada frontend usa chamadas do store para os endpoints de dados consolidados.

## 7. Perfil e gestão da conta

### Implementação principal
- [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx)
- [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
- [backend/routers/auth.py](backend/routers/auth.py)

### Funcionalidades
- visualização do perfil
- logout
- eliminação da conta
- gestão de sessões
- reset de dados por categoria
- backup e restauração de dados locais

## 8. Exportação e relatórios

### Implementação principal
- [frontend/src/utils/exportUtils.ts](frontend/src/utils/exportUtils.ts)
- [backend/Dockerfile](backend/Dockerfile)
- [README.md](README.md)

### Funcionalidades
- exportação de dados em XLSX/CSV
- geração de PDF de ocorrências e relatórios
- integração com LibreOffice/soffice em ambiente backend

### Observações
- A geração de PDF depende de software externo e ambiente configurado.
- A documentação existente aponta para necessidade de `LIBREOFFICE_BIN` e dockerizado para Render.

## 9. Tema, preferências e UX

### Implementação principal
- [frontend/src/theme/themes.ts](frontend/src/theme/themes.ts)
- [frontend/src/store/preferencesStore.ts](frontend/src/store/preferencesStore.ts)
- [frontend/src/store/paintStore.ts](frontend/src/store/paintStore.ts)

### Funcionalidades
- suporte a tema claro/escuro
- seleção de paleta e preferências visuais
- modo de pintura e edição rápida no calendário

## 10. Páginas e rotas da aplicação

### Rotas de autenticação
- [frontend/app/login.tsx](frontend/app/login.tsx)
- [frontend/app/register.tsx](frontend/app/register.tsx)

### Rotas principais
- [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx): calendário e turnos
- [frontend/app/(tabs)/gratificados.tsx](frontend/app/(tabs)/gratificados.tsx): gratificações
- [frontend/app/(tabs)/ocorrencias.tsx](frontend/app/(tabs)/ocorrencias.tsx): ocorrências
- [frontend/app/(tabs)/stats.tsx](frontend/app/(tabs)/stats.tsx): estatísticas
- [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx): conta e reset

## Pontos ainda não completamente verificados

- Alguns fluxos específicos de exportação e PDF exigem ambiente externo e ainda não foram validados em execução real em todas as combinações de sistema.
- A complexidade do calendário e dos componentes do frontend exige revisão adicional em termos de UX e regressão em telas mais densas.
- O estado detalhado de módulos menos centrais, como helpers e utilitários de exportação, foi inferido a partir do código, mas não foi validado por execução completa de cada cenário.
