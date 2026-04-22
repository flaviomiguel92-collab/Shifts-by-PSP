@echo off
cd /d %~dp0

:: Inicia o Backend Python
start "Backend" cmd /k "cd backend && python server.py"

:: Aguarda 2 segundos para o backend arrancar
timeout /t 2 /nobreak

:: Inicia o Frontend
start "Frontend" cmd /k "npx expo start --clear"

pause