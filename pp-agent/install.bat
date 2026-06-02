@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  ProSendWorship PP Agent — Installation en une seule etape
::  Double-cliquez sur ce fichier pour tout configurer
:: ============================================================

set "AGENT_DIR=%~dp0"
set "TASK_NAME=ProSendWorship PP Agent"
set "START_BAT=%AGENT_DIR%_start.bat"

echo.
echo  ================================================
echo    ProSendWorship PP Agent - Installation
echo  ================================================
echo.


:: ── ETAPE 1 : Node.js ──────────────────────────────────────
echo  [1/4]  Verification de Node.js...

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f %%v in ('node --version') do echo         OK  Node.js %%v detecte
    goto STEP2
)

echo         Node.js introuvable. Installation automatique...
echo.

:: Essai 1 : winget (Windows 10/11)
where winget >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo         Utilisation de Windows Package Manager...
    winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    :: Rafraichir le PATH pour cette session
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%b"
    set "PATH=!SYS_PATH!;!USR_PATH!"
    goto CHECK_NODE
)

:: Essai 2 : telecharger le MSI directement
echo         Telechargement de Node.js 20 LTS...
powershell -NoProfile -Command ^
  "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.3/node-v20.18.3-x64.msi' -OutFile '$env:TEMP\nodejs.msi' -UseBasicParsing"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : Impossible de telecharger Node.js.
    echo  Installez-le manuellement : https://nodejs.org
    echo  Puis relancez ce script.
    echo.
    pause & exit /b 1
)
echo         Installation de Node.js (patientez ~30s)...
msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart ADDLOCAL=ALL
del "%TEMP%\nodejs.msi" >nul 2>nul
set "PATH=%PATH%;C:\Program Files\nodejs"

:CHECK_NODE
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : Node.js n'a pas pu etre installe.
    echo  Installez-le manuellement : https://nodejs.org  puis relancez.
    echo.
    pause & exit /b 1
)
for /f %%v in ('node --version') do echo         OK  Node.js %%v installe


:: ── ETAPE 2 : Dependances npm ──────────────────────────────
:STEP2
echo.
echo  [2/4]  Installation des librairies npm...
cd /d "%AGENT_DIR%"
call npm install --production --loglevel error
if %ERRORLEVEL% NEQ 0 (
    echo  ERREUR npm install. Verifiez votre connexion Internet.
    pause & exit /b 1
)
echo         OK  Librairies installees


:: ── ETAPE 3 : Configuration ────────────────────────────────
echo.
echo  [3/4]  Configuration de l'agent...
echo.

if exist "%AGENT_DIR%pp-agent-config.json" (
    echo         Une configuration existe deja.
    set /p "REDO=         Reconfigurer ? (o = oui  /  Entree = garder) : "
    if /i "!REDO!"=="o" (
        del "%AGENT_DIR%pp-agent-config.json"
        node "%AGENT_DIR%setup.js"
    ) else (
        echo         OK  Configuration existante conservee
    )
) else (
    node "%AGENT_DIR%setup.js"
)

if not exist "%AGENT_DIR%pp-agent-config.json" (
    echo.
    echo  ERREUR : Configuration non creee. Veuillez reessayer.
    pause & exit /b 1
)
echo         OK  Configuration sauvegardee


:: ── ETAPE 4 : Service Windows (demarrage automatique) ──────
echo.
echo  [4/4]  Installation du service Windows (sans fenetre)...

:: Le watchdog surveille ProPresenter et demarre l'agent automatiquement
set "WATCHDOG_VBS=%AGENT_DIR%_watchdog.vbs"

:: Supprimer l'ancienne tache si elle existe
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>nul

:: Creer la tache : watchdog demarre a la connexion, sans fenetre
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "wscript.exe \"%WATCHDOG_VBS%\"" ^
    /sc ONLOGON ^
    /delay 0000:10 ^
    /rl HIGHEST ^
    /f ^
    /ru "%USERNAME%" >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo         OK  Watchdog installe (demarre l'agent a l'ouverture de ProPresenter)
) else (
    echo         NOTE : Watchdog non installe (droits insuffisants^)
    echo               Relancez ce script en tant qu'Administrateur.
)

:: Demarrer le watchdog immediatement (sans fenetre)
start "" wscript.exe "%WATCHDOG_VBS%"

echo.
echo  ================================================
echo    Installation terminee !  L'agent est actif.
echo  ================================================
echo.
echo    ProPresenter est maintenant connecte a ProSendWorship.
echo    L'agent demarrera automatiquement a chaque connexion.
echo.
echo    Pour verifier : ouvrez ProSendWorship et cliquez sur
echo    l'icone ProPresenter - le statut devrait etre VERT.
echo.
pause
endlocal
