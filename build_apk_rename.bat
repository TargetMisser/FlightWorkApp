taskkill /f /im java.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
node rename_node_modules_builds.js
cd android
ren app\build build_old_%RANDOM% >nul 2>&1
call gradlew.bat assembleDebug > ..\build_output.txt 2>&1

