taskkill /f /im java.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
cd android
call gradlew.bat clean > ..\build_output_clean.txt 2>&1
call gradlew.bat assembleDebug > ..\build_output.txt 2>&1
