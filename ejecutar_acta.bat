@echo off
setlocal

cd /d "%~dp0"

set "URL=[127.0.0.1](http://127.0.0.1:8000/)"

if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: la aplicacion no esta instalada todavia.
    echo Ejecuta primero instalar_y_ejecutar.bat
    pause
    exit /b 1
)

call ".venv\Scripts\activate.bat"

echo Comprobando si el servidor ya esta en ejecucion...
powershell -Command ^
  "try { $r = Invoke-WebRequest -Uri '[127.0.0.1](http://127.0.0.1:8000/)' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"

if %errorlevel%==0 (
    start "" "%URL%"
    exit /b 0
)

start "" /b pythonw.exe server.py

timeout /t 2 /nobreak >nul

start "" "%URL%"

exit /b 0
