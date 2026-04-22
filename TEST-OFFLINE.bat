@echo off
setlocal enabledelayedexpansion

cls
color 0A
title Shift Olama - Teste Offline

echo.
echo ============================================================
echo          SHIFT OLAMA - TESTE OFFLINE
echo ============================================================
echo.

set "PROJECT_DIR=%~dp0"
echo [INFO] Diretorio: %PROJECT_DIR%
echo.

REM Verifica diretorios
if not exist "%PROJECT_DIR%backend" (
    color 0C
    echo [ERRO] Pasta 'backend' nao encontrada!
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%frontend" (
    color 0C
    echo [ERRO] Pasta 'frontend' nao encontrada!
    pause
    exit /b 1
)

echo [OK] Diretorios encontrados
echo.

REM Instala dependencias do backend se necessario
echo [VERIFICACAO] Verificando dependencias do backend...
cd /d "%PROJECT_DIR%backend"
pip show uvicorn >nul 2>&1
if errorlevel 1 (
    echo [INSTALACAO] Instalando dependencias do backend...
    pip install -q -r requirements.txt
)
echo [OK] Dependencias backend OK
echo.

REM Instala dependencias do frontend se necessario
echo [VERIFICACAO] Verificando dependencias do frontend...
cd /d "%PROJECT_DIR%frontend"
if not exist "node_modules" (
    echo [INSTALACAO] Instalando dependencias do frontend...
    call npm install -q
)
echo [OK] Dependencias frontend OK
echo.

REM Volta para o diretorio raiz
cd /d "%PROJECT_DIR%"

REM Abre Backend
echo [INICIANDO] Backend (Mock - sem MongoDB)...
echo.
start "Shift Olama - Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && python -m uvicorn server_mock:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 5 /nobreak

REM Abre Frontend
echo.
echo [INICIANDO] Frontend (Expo)...
echo.
start "Shift Olama - Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npx expo start --clear"

echo.
echo ============================================================
echo AMBIENTE OFFLINE INICIADO COM SUCESSO!
echo ============================================================
echo.
echo Servicos abertos em janelas separadas:
echo.
echo Backend:
echo   - URL:   http://localhost:8000
echo   - Docs:  http://localhost:8000/docs
echo   - Status: Rodando em Mock Mode (sem MongoDB)
echo.
echo Frontend:
echo   - Terminal Expo aberto
echo   - Pressione 'i' para iOS, 'a' para Android, 'w' para Web
echo   - Pressione 'q' para sair
echo.
echo Esta janela pode ser fechada a qualquer momento.
echo Os servicos continuarao a correr nas suas janelas.
echo.
pause
