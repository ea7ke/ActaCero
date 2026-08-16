@echo off
title Acta Cero - Iniciando
cd /d "%~dp0"

REM --- Buscar un interprete de Python disponible, y su version "sin ventana" ---
set "PYCMD="
set "PYCMD_OCULTO="

where python >nul 2>nul
if not errorlevel 1 (
    set "PYCMD=python"
    set "PYCMD_OCULTO=pythonw"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "PYCMD=py"
        set "PYCMD_OCULTO=pyw"
    )
)

if "%PYCMD%"=="" (
    echo.
    echo   No se ha encontrado Python instalado en este equipo.
    echo   Instala Python desde https://www.python.org/downloads/
    echo   ^(marca la casilla "Add python.exe to PATH" durante la instalacion^)
    echo   y vuelve a ejecutar este acceso directo.
    echo.
    pause
    exit /b 1
)

echo.
echo   Comprobando dependencias necesarias, un momento...
%PYCMD% -m pip install -r requirements.txt --quiet --disable-pip-version-check

if errorlevel 1 (
    echo.
    echo   No se han podido instalar las dependencias.
    echo   Comprueba que este equipo tiene conexion a internet la primera vez
    echo   que se ejecuta ^(luego ya no hara falta^).
    echo.
    pause
    exit /b 1
)

REM Si quedaba un servidor de una ejecucion anterior, lo paramos primero
if exist acta_cero.pid (
    for /f "usebackq delims=" %%p in ("acta_cero.pid") do (
        taskkill /PID %%p /F >nul 2>nul
    )
    del acta_cero.pid >nul 2>nul
)

echo.
echo   Arrancando el servidor de Acta Cero en segundo plano...
start "" /B %PYCMD_OCULTO% server.py

REM Dar un par de segundos al servidor para que arranque antes de abrir el navegador
timeout /t 2 /nobreak >nul

start "" http://127.0.0.1:8000

echo.
echo   Acta Cero se ha abierto en el navegador. El servidor sigue funcionando
echo   en segundo plano, sin ninguna ventana. Para pararlo, usa detener_acta.bat.
echo   Esta ventana se cerrara sola.
timeout /t 3 /nobreak >nul
exit /b 0
