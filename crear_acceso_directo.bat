@echo off
title Acta Cero - Crear acceso directo
setlocal

set "CARPETA=%~dp0"
set "VBS=%TEMP%\crear_acceso_directo_actacero.vbs"

> "%VBS%" echo Set oWS = WScript.CreateObject("WScript.Shell")
>> "%VBS%" echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Acta Cero.lnk"
>> "%VBS%" echo Set oLink = oWS.CreateShortcut(sLinkFile)
>> "%VBS%" echo oLink.TargetPath = "%CARPETA%ejecutar_acta.bat"
>> "%VBS%" echo oLink.WorkingDirectory = "%CARPETA%"
>> "%VBS%" echo oLink.Description = "Arrancar Acta Cero"
>> "%VBS%" echo oLink.IconLocation = "%CARPETA%img\acta-cero.ico"
>> "%VBS%" echo oLink.WindowStyle = 1
>> "%VBS%" echo oLink.Save

cscript //nologo "%VBS%"
del "%VBS%" >nul 2>nul

REM Igual que hace ejecutar_acta.bat en la instalacion: ponemos el icono de
REM Acta Cero a los archivos .ac0 en el Explorador (no hace que se abran
REM solos al hacer doble clic, solo cambia como se ven).
set "RUTA_ICONO=%CARPETA%img\acta-cero.ico"
set "RUTA_ICONO_REG=%RUTA_ICONO:\=\\%"
set "REGFILE=%TEMP%\acta_cero_icono.reg"

> "%REGFILE%" echo Windows Registry Editor Version 5.00
>> "%REGFILE%" echo.
>> "%REGFILE%" echo [HKEY_CURRENT_USER\Software\Classes\.ac0]
>> "%REGFILE%" echo @="ActaCero.Archivo"
>> "%REGFILE%" echo.
>> "%REGFILE%" echo [HKEY_CURRENT_USER\Software\Classes\ActaCero.Archivo]
>> "%REGFILE%" echo @="Archivo de Acta Cero"
>> "%REGFILE%" echo.
>> "%REGFILE%" echo [HKEY_CURRENT_USER\Software\Classes\ActaCero.Archivo\DefaultIcon]
>> "%REGFILE%" echo @="%RUTA_ICONO_REG%"

reg import "%REGFILE%" >nul 2>nul
del "%REGFILE%" >nul 2>nul

echo.
echo   Acceso directo "Acta Cero" creado en el Escritorio.
echo   A partir de ahora, para usar la aplicacion basta con hacer doble clic
echo   en ese icono del Escritorio.
echo   Tambien se ha puesto el icono de Acta Cero a los archivos .ac0.
echo.
timeout /t 4 /nobreak >nul
exit /b 0
