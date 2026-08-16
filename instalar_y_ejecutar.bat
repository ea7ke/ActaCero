@echo off
setlocal

cd /d "%~dp0"

set "URL=http://127.0.0.1:8000/"

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

if not exist ".venv" (
    echo Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: no se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
)

call ".venv\Scripts\activate.bat"

echo Actualizando pip...
python -m pip install --upgrade pip >nul

echo Instalando dependencias...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: no se pudieron instalar las dependencias.
    pause
    exit /b 1
)

echo Comprobando si el servidor ya esta en ejecucion...
powershell -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"

if %errorlevel%==0 (
    echo El servidor ya estaba en ejecucion.
    start "" "%URL%"
    exit /b 0
)

echo Iniciando servidor...
start "" /b pythonw.exe server.py

echo Esperando a que el servidor arranque...
timeout /t 2 /nobreak >nul

start "" "%URL%"

exit /b 0
