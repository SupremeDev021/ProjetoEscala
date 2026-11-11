@echo off
setlocal
set "DASHBOARD=https://supremedev021.github.io/ProjetoEscala/#/dashboard"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "%DASHBOARD%" --edge-kiosk-type=fullscreen --no-first-run
  exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "%DASHBOARD%" --edge-kiosk-type=fullscreen --no-first-run
  exit /b
)
echo Microsoft Edge nao encontrado. Instale o Edge ou ajuste o caminho neste arquivo.
pause
