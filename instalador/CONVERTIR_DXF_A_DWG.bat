@echo off
chcp 65001 >nul
title MNM SOLAR - Convertir DXF a DWG
cd /d "%~dp0"
if "%~1"=="" (
    echo.
    echo  Arrastra uno o varios archivos .dxf encima de este .bat
    echo  o ejecutalo asi:  CONVERTIR_DXF_A_DWG.bat plano.dxf
    echo.
    pause
    exit /b 1
)
:siguiente
if "%~1"=="" goto fin
echo  Convirtiendo "%~nx1" ...
python herramientas\dxf_a_dwg.py "%~f1" "%~dpn1.dwg"
if errorlevel 1 echo  [ERROR] No se pudo convertir "%~nx1"
shift
goto siguiente
:fin
echo.
echo  Terminado. El .dwg queda en la misma carpeta que cada .dxf
pause
