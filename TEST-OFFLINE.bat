@echo off
setlocal enabledelayedexpansion

REM Script para testar a app offline (backend + frontend)
REM Abre ambas em janelas separadas para desenvolvimento local

title Shift Olama - Teste Offline

cls
color 0A

echo.
echo ============================================================
echo          SHIFT OLAMA - TESTE OFFLINE LOCAL
echo ============================================================
echo.
echo Este script inicia:
echo   1. Backend (FastAPI + Python)
echo   2. Frontend (Expo React Native)
echo.
echo Ambas as aplicacoes abrem em janelas separadas.
echo.
timeout /t 2 /nobreak

REM Define o diretorio do script
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Verifica se estamos no diretorio correto
echo.
echo [VERIFICACAO] Verificando diretorios...
if not exist "backend" (
    color 0C
    echo [ERRO] Diretorio 'backend' nao encontrado!
    echo Diretorio atual: %CD%
    echo.
    echo Por favor, execute este script a partir da raiz do projeto.
    echo.
    pause
    exit /b 1
)

if not exist "frontend" (
    color 0C
    echo [ERRO] Diretorio 'frontend' nao encontrado!
    echo Diretorio atual: %CD%
    echo.
    echo Por favor, execute este script a partir da raiz do projeto.
    echo.
    pause
    exit /b 1
)

echo [OK] Diretorios encontrados!
echo.

REM Verifica se Python esta instalado
echo [VERIFICACAO] Verificando Python...
python --version 2>nul
if errorlevel 1 (
    color 0C
    echo [ERRO] Python nao esta instalado ou nao esta no PATH
    echo Por favor, instale Python antes de continuar.
    echo Visite: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
echo [OK] Python disponivel!
echo.

REM Verifica se npm esta instalado
echo [VERIFICACAO] Verificando Node.js/npm...
npm --version 2>nul
if errorlevel 1 (
    color 0C
    echo [ERRO] Node.js/npm nao esta instalado ou nao esta no PATH
    echo Por favor, instale Node.js antes de continuar.
    echo Visite: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js/npm disponivel!
echo.

color 0A
echo [OK] Todas as verificacoes passaram!
echo.
echo ============================================================
echo Iniciando Backend (Mock - Sem MongoDB)...
echo ============================================================
echo.

REM Inicia o Backend em uma janela separada (usando mock - sem MongoDB)
start "SHIFT OLAMA - Backend (FastAPI Mock)" cmd /k "cd /d "%SCRIPT_DIR%backend" && uvicorn server_mock:app --host 0.0.0.0 --port 8000 --reload && echo. && echo [INFO] Backend encerrado. Esta janela vai fechar em 10 segundos... && timeout /t 10"

echo [OK] Backend iniciado em janela separada (Mock Mode)!
echo.
echo Aguardando 4 segundos para o backend arrancar...
timeout /t 4 /nobreak

echo.
echo ============================================================
echo Iniciando Frontend...
echo ============================================================
echo.

REM Inicia o Frontend em uma janela separada
start "SHIFT OLAMA - Frontend (Expo)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npx expo start --clear && echo. && echo [INFO] Frontend encerrado. Esta janela vai fechar em 10 segundos... && timeout /t 10"

echo [OK] Frontend iniciado em janela separada!
echo.
echo ============================================================
echo PRONTO PARA TESTAR!
echo ============================================================
echo.
echo Backend rodando em: http://localhost:8000
echo   - Documentacao: http://localhost:8000/docs
echo   - API: http://localhost:8000/api
echo.
echo Frontend rodando em: Terminal Expo
echo   - Pressiona 'i' para abrir no iOS
echo   - Pressiona 'a' para abrir no Android
echo   - Pressiona 'w' para abrir no Web
echo   - Pressiona 'q' para sair
echo.
echo Duas novas janelas foram abertas com o backend e frontend.
echo.
echo PARA PARAR TUDO:
echo   - Digite 'q' na janela do Frontend para sair
echo   - Pressione Ctrl+C na janela do Backend para parar
echo   - Feche ambas as janelas
echo.
echo Esta janela pode ser fechada a qualquer momento.
echo.
pause
