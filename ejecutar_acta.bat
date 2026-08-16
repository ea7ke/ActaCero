@echo off
title Acta Cero - Iniciando
cd /d "%~dp0"

REM --- Buscar un interprete de Python disponible (python o, en su defecto, el lanzador py) ---
set "PYCMD="

where python >nul 2>nul
if not errorlevel 1 (
    set "PYCMD=python"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "PYCMD=py"
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

echo.
echo   Arrancando el servidor de Acta Cero...
start "Acta Cero - Servidor" cmd /k %PYCMD% server.py

REM Dar un par de segundos al servidor para que arranque antes de abrir el navegador
timeout /t 2 /nobreak >nul

start "" http://127.0.0.1:8000

echo.
echo   Acta Cero se ha abierto en el navegador.
echo   Esta ventana se puede cerrar: el servidor sigue funcionando en la otra
echo   ventana titulada "Acta Cero - Servidor". No cierres esa para seguir
echo   usando la aplicacion.
echo.
timeout /t 4
exit /b 0
