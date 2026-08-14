@echo off
setlocal

cd /d "%~dp0"

if not exist .venv\Scripts\activate.bat (
    echo ERROR: la aplicacion no esta instalada todavia.
    echo Ejecuta primero instalar_y_ejecutar.bat
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

start "" /b pythonw.exe server.py

timeout /t 2 /nobreak >null

start "" "http://127.0.0.1:8000/"

exit
