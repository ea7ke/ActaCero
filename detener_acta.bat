@echo off
title Acta Cero - Detener
echo.
echo   Deteniendo el servidor de Acta Cero...
echo.

taskkill /FI "WINDOWTITLE eq Acta Cero - Servidor*" /T /F >nul 2>nul

if errorlevel 1 (
    echo   No se ha encontrado ningun servidor de Acta Cero en ejecucion.
) else (
    echo   Servidor detenido correctamente.
)

echo.
pause
