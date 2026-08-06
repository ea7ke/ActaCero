@echo off
setlocal

cd /d "%~dp0"

echo ===============================
echo   ACTA CERO - INSTALACION
echo ===============================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH.
    echo Instala Python 3 y marca la opcion "Add Python to PATH".
    pause
    exit /b 1
)

if not exist .venv (
    echo Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: no se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

echo Actualizando pip...
python -m pip install --upgrade pip

echo Instalando dependencias...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: no se pudieron instalar las dependencias.
    pause
    exit /b 1
)

REM start "" [127.0.0.1](http://127.0.0.1:8000/)

echo.
echo Iniciando servidor...
start python server.py
timeout /t 2 /nobreak
start "" "http://127.0.0.1:8000/"
pause
