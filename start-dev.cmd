@echo off
setlocal

set "NODE_EXE="
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE_EXE (
  if exist "%BUNDLED_NODE%" set "NODE_EXE=%BUNDLED_NODE%"
)

if not defined NODE_EXE (
  where node >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where node') do (
      if not defined NODE_EXE set "NODE_EXE=%%i"
    )
  )
)

if not defined NODE_EXE (
  echo Node.js was not found. Install Node.js or run inside the Codex desktop environment.
  exit /b 1
)

"%NODE_EXE%" scripts\dev-server.mjs
