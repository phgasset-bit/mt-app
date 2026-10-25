@echo off
chcp 65001 >nul
title MNM SOLAR - Instalar herramientas DWG
cd /d "%~dp0"
echo.
echo  MNM SOLAR - Herramientas de planos DXF/DWG
echo  ==========================================
echo.
where python >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] No se encuentra Python.
    echo  Instala Python 3.10 o superior desde https://www.python.org/downloads/
    echo  y marca la casilla "Add python.exe to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)
python --version
echo.
echo  Instalando librerias de Python (ezdxf, matplotlib)...
python -m pip install --upgrade --user -r requirements.txt
if errorlevel 1 (
    echo  [ERROR] Fallo la instalacion de librerias.
    pause
    exit /b 1
)
echo.
echo  Comprobando LibreDWG...
herramientas\libredwg\dwgread.exe --version
if errorlevel 1 (
    echo  [ERROR] LibreDWG no arranca. Comprueba que la carpeta herramientas\libredwg esta completa.
    pause
    exit /b 1
)
echo.
echo  Instalacion completada.
echo  - Arrastra un .dxf sobre CONVERTIR_DXF_A_DWG.bat para obtener el .dwg
echo  - GENERAR_PLANO_ANSO.bat vuelve a crear el esquema unifilar de ANSO
echo.
pause
