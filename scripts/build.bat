@echo off
setlocal enabledelayedexpansion

REM Install root dependencies
echo Installing root dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install root dependencies
    exit /b 1
)

REM Build core package
echo.
echo Building core package...
pushd packages\core
call npm run build
if errorlevel 1 (
    echo Core build failed!
    popd
    exit /b 1
)
popd

echo.
echo Build completed successfully!
exit /b 0
