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
>> "%VBS%" echo oLink.WindowStyle = 1
>> "%VBS%" echo oLink.Save

cscript //nologo "%VBS%"
del "%VBS%" >nul 2>nul

echo.
echo   Acceso directo "Acta Cero" creado en el Escritorio.
echo   A partir de ahora, para usar la aplicacion basta con hacer doble clic
echo   en ese icono del Escritorio.
echo.
pause
