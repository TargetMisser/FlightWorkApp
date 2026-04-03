@echo off
echo [1/4] Killing Java and Node processes...
taskkill /f /im java.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Cleaning old builds...
node rename_node_modules_builds.js
cd android
if exist app\build (
    ren app\build build_old_%RANDOM% >nul 2>&1
)

echo [3/4] Building release APK...
call gradlew.bat assembleRelease
if %ERRORLEVEL% neq 0 (
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo [4/4] Copying APK to Downloads...
copy /y app\build\outputs\apk\release\app-release.apk "%USERPROFILE%\Downloads\AeroStaffPro.apk" >nul
echo.
echo ========================================
echo   APK pronta: %USERPROFILE%\Downloads\AeroStaffPro.apk
echo ========================================
pause
