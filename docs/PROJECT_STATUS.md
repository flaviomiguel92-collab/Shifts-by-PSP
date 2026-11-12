# Estado atual do projeto

## Resumo executivo

O projeto encontra-se em fase de desenvolvimento funcional com arquitetura bem definida e vários módulos já implementados e integrados. O código confirma um sistema de gestão de turnos, gratificações, ocorrências, estatísticas, autenticação e conta de utilizador.

As áreas mais consolidadas no código são:
- autenticação e sessão
- gestão de turnos e calendário
- ocorrências com fotos e documentos
- gratificações e cálculo
- estatísticas
- integração com MongoDB e deploy por Docker/Vercel

## Funcionalidades confirmadas

### Backend
- Auth e sessão em [backend/routers/auth.py](backend/routers/auth.py)
- Turnos em [backend/routers/shifts.py](backend/routers/shifts.py)
- Tipos de turno em [backend/routers/shift_types.py](backend/routers/shift_types.py)
- Ciclos em [backend/routers/cycles.py](backend/routers/cycles.py)
- Eventos em [backend/routers/events.py](backend/routers/events.py)
- Gratificações em [backend/routers/gratifications.py](backend/routers/gratifications.py)
- Ocorrências em [backend/routers/occurrences.py](backend/routers/occurrences.py)
- Estatísticas em [backend/routers/stats.py](backend/routers/stats.py)
- Middleware de segurança em [backend/server.py](backend/server.py)
- Inicialização e índices Mongo em [backend/db.py](backend/db.py)

### Frontend
- login e registo em [frontend/app/login.tsx](frontend/app/login.tsx) e [frontend/app/register.tsx](frontend/app/register.tsx)
- calendário e turnos em [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx)
- gratificados em [frontend/app/(tabs)/gratificados.tsx](frontend/app/(tabs)/gratificados.tsx)
- ocorrências em [frontend/app/(tabs)/ocorrencias.tsx](frontend/app/(tabs)/ocorrencias.tsx)
- estatísticas em [frontend/app/(tabs)/stats.tsx](frontend/app/(tabs)/stats.tsx)
- perfil e gestão de conta em [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx)
- stores principais em [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts) e [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts)

## Funcionalidades em estado de atenção

### Segurança e isolamento
O código mostra uma preocupação explícita com segurança e user_id, mas continua sendo uma área crítica a ser monitorizada em qualquer revisão. Isso inclui:
- autenticação
- autorização
- endereços de dados sensíveis
- sessões e cookies
- limpeza de dados por utilizador

### Integridade do schema e migração
- a base de dados é inicializada com índices e validações em [backend/db.py](backend/db.py)
- contudo, a documentação e os ficheiros indicam que mudanças no schema devem ser tratadas com cuidado e validadas em testes antes de produção

### Dependência externa de PDF
- O output de documentos e relatórios depende de LibreOffice/soffice, configurável por ambiente
- a aplicação assume esse binário disponível em runtime

## Problemas conhecidos ou pontos de risco

### 1. Dependência de ambiente externo
A aplicação depende de:
- MongoDB
- LibreOffice/soffice
- variáveis de ambiente de deploy
- CORS e URLs de frontend/backend

### 2. Dados sensíveis e PII
As ocorrências incluem pessoas e dados sensíveis. O código implementa criptografia opcional em [backend/security/crypto.py](backend/security/crypto.py), mas essa funcionalidade depende de configuração e de processo de rollout bem controlado.

### 3. Complexidade de sincronização do frontend
O frontend separa dados server-backed e local-only em [frontend/src/store/dataStore.ts](frontend/src/store/dataStore.ts). Isso reduz riscos de persistência local acidental, mas exige cuidado em qualquer alteração de sincronização.

### 4. Evolução de domínio e backoffice
O projeto parece estar em crescimento funcional, com várias áreas de negócio integradas; por isso, mudanças em domínios centrais podem ter implicações em múltiplos módulos.

## Áreas por validar

### Ainda não confirmadas por execução completa
- cobertura end-to-end de todas as rotas e telas
- comportamento em produção para cenários de falha de rede e de backend
- geração real de PDF em ambiente final com LibreOffice
- regressões em fluxos de bulk write e reset de dados
- consistência completa entre frontend, store e backend em todos os cargos/combinações

### O que já está sustentado pelo código
- as principais camadas arquiteturais existem e são consistentes
- a estrutura modular é coerente
- as regras principais de segurança e user isolation são explícitas
- os fluxos principais de negócio estão implementados

## Estado geral

O projeto está em estado funcional e com uma base de arquitetura estável, com documentação e código alinhados em vários domínios centrais. O principal fator de risco continua a ser a manutenção de segurança, integridade, sincronização e ambiente externo em operação real.

## Pontos ainda não verificados

- execução completa de todos os testes em todos os módulos
- validação do comportamento final em ambiente de produção real
- revisão completa de regressões em cada fluxo de dados sensível
- auditoria detalhada de todos os endpoints e UI secundárias
