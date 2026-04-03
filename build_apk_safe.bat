cd android
call gradlew.bat --stop > ..\build_output_stop.txt 2>&1
call gradlew.bat clean > ..\build_output_clean.txt 2>&1
call gradlew.bat assembleDebug > ..\build_output.txt 2>&1
