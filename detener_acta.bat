@echo off
title Acta Cero - Detener
cd /d "%~dp0"

echo.
echo   Deteniendo el servidor de Acta Cero...
echo.

if not exist acta_cero.pid (
    echo   No se ha encontrado ningun servidor de Acta Cero en ejecucion.
    echo.
    timeout /t 3 /nobreak >nul
    exit /b 0
)

set "PID_SERVIDOR="
for /f "usebackq delims=" %%p in ("acta_cero.pid") do set "PID_SERVIDOR=%%p"

if "%PID_SERVIDOR%"=="" (
    echo   No se ha podido leer el identificador del servidor.
) else (
    taskkill /PID %PID_SERVIDOR% /F >nul 2>nul
    if errorlevel 1 (
        echo   El servidor ya no estaba en ejecucion.
    ) else (
        echo   Servidor detenido correctamente.
    )
)

del acta_cero.pid >nul 2>nul

echo.
timeout /t 3 /nobreak >nul
exit /b 0
