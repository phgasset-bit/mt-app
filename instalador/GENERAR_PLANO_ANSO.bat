@echo off
chcp 65001 >nul
title MNM SOLAR - Generar esquema unifilar ANSO
cd /d "%~dp0"
set PLANO=planos\ANSO\Esquema_Unifilar_General_MT_Autoconsumo_ANSO
python herramientas\generar_esquema_unifilar_anso.py "%PLANO%.dxf" || goto error
python herramientas\dxf_a_dwg.py "%PLANO%.dxf" "%PLANO%.dwg" || goto error
echo.
echo  Plano generado en planos\ANSO (DXF y DWG)
pause
exit /b 0
:error
echo  [ERROR] No se pudo generar el plano. Ejecuta antes INSTALAR.bat
pause
exit /b 1
