@echo off
title Acta Cero - Detener
cd /d "%~dp0"

echo.
echo   Deteniendo el servidor de Acta Cero...
echo.

set "ENCONTRADO=0"

REM 1) Si hay un PID guardado de la ultima vez que se arranco con ejecutar_acta.bat, matarlo
if exist acta_cero.pid (
    set "PID_SERVIDOR="
    for /f "usebackq delims=" %%p in ("acta_cero.pid") do set "PID_SERVIDOR=%%p"

    if not "%PID_SERVIDOR%"=="" (
        taskkill /PID %PID_SERVIDOR% /F >nul 2>nul
        if not errorlevel 1 set "ENCONTRADO=1"
    )

    del acta_cero.pid >nul 2>nul
)

REM 2) Por si queda algun otro proceso (de una ejecucion antigua, o arrancado a
REM    mano) que no dejo fichero de PID, cerramos tambien lo que ocupe el
REM    puerto 8000, sea cual sea su origen. Esto es lo que de verdad garantiza
REM    que no queda un servidor viejo sirviendo la app.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>nul
    if not errorlevel 1 set "ENCONTRADO=1"
)

if "%ENCONTRADO%"=="1" (
    echo   Servidor detenido correctamente.
) else (
    echo   No se ha encontrado ningun servidor de Acta Cero en ejecucion.
)

echo.
timeout /t 3 /nobreak >nul
exit /b 0
