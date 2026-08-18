@echo off
title Acta Cero
setlocal

REM ============================================================
REM  Este script hace dos trabajos distintos segun desde donde
REM  se ejecute:
REM   - Si se ejecuta desde la carpeta descargada/descomprimida
REM     (la primera vez), se INSTALA: copia todo a la carpeta
REM     personal del usuario, crea el acceso directo del
REM     Escritorio, y se vuelve a lanzar ya desde ahi.
REM   - Si se ejecuta ya desde esa carpeta instalada (por
REM     ejemplo, con el icono del Escritorio), simplemente
REM     ARRANCA la aplicacion.
REM ============================================================

set "CARPETA_ACTUAL=%~dp0"
set "CARPETA_INSTALACION=%USERPROFILE%\.ACERO\"

if /I not "%CARPETA_ACTUAL%"=="%CARPETA_INSTALACION%" goto :instalar

REM --- Ya se esta ejecutando desde la carpeta instalada: arrancar directamente ---
cd /d "%CARPETA_INSTALACION%"
goto :arrancar


:instalar
echo.
echo   Primera vez que se ejecuta: instalando Acta Cero en tu carpeta de usuario...
echo   ^(%CARPETA_INSTALACION%^)
echo.

if not exist "%CARPETA_INSTALACION%" mkdir "%CARPETA_INSTALACION%"

REM Se copia todo el programa, EXCEPTO los datos propios de una instalacion ya
REM existente (configuracion, firmas subidas, y el PID del servidor), para no
REM pisar nunca lo que un compañero ya tenga configurado si vuelve a instalar
REM una version mas nueva encima.
robocopy "%CARPETA_ACTUAL%." "%CARPETA_INSTALACION%." /E /XD datos firmas /XF acta_cero.pid /NFL /NDL /NJH /NJS /R:2 /W:1 >nul

if %ERRORLEVEL% GEQ 8 (
    echo.
    echo   No se han podido copiar los archivos a %CARPETA_INSTALACION%.
    echo   Comprueba que tienes permisos de escritura en tu carpeta de usuario.
    echo.
    pause
    exit /b 1
)

echo   Creando el acceso directo del Escritorio...

set "VBS=%TEMP%\crear_acceso_directo_actacero.vbs"

> "%VBS%" echo Set oWS = WScript.CreateObject("WScript.Shell")
>> "%VBS%" echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Acta Cero.lnk"
>> "%VBS%" echo Set oLink = oWS.CreateShortcut(sLinkFile)
>> "%VBS%" echo oLink.TargetPath = "%CARPETA_INSTALACION%ejecutar_acta.bat"
>> "%VBS%" echo oLink.WorkingDirectory = "%CARPETA_INSTALACION%"
>> "%VBS%" echo oLink.Description = "Arrancar Acta Cero"
>> "%VBS%" echo oLink.WindowStyle = 1
>> "%VBS%" echo oLink.Save

cscript //nologo "%VBS%" >nul
del "%VBS%" >nul 2>nul

echo.
echo   Instalacion completada. Se ha creado el icono "Acta Cero" en tu Escritorio.
echo   La proxima vez, usa ese icono en vez de este archivo.
echo.
echo   Arrancando la aplicacion por primera vez...
timeout /t 2 /nobreak >nul

REM A partir de ahora, la copia "de verdad" es la de la carpeta instalada.
start "" "%CARPETA_INSTALACION%ejecutar_acta.bat"
exit /b 0


:arrancar
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
    echo   y vuelve a hacer doble clic en el icono "Acta Cero" del Escritorio.
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

REM Antes de arrancar, nos aseguramos de que no quede ningun servidor previo
REM ocupando el puerto 8000 -- ni el de la ultima vez (por su PID guardado)
REM ni ningun otro que se hubiera quedado huerfano sin dejar ese fichero.
if exist acta_cero.pid (
    for /f "usebackq delims=" %%p in ("acta_cero.pid") do (
        taskkill /PID %%p /F >nul 2>nul
    )
    del acta_cero.pid >nul 2>nul
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>nul
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
