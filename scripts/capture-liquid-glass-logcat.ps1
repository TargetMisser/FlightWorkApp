param(
    [string]$Serial = "",
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$adb = (Get-Command adb -ErrorAction Stop).Source
$adbArgs = @()
if ($Serial) {
    $adbArgs += @("-s", $Serial)
}

$deviceState = (& $adb @adbArgs get-state 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $deviceState -ne "device") {
    throw "No adb device is connected. Connect the phone, accept the debug prompt, and retry."
}

if (-not $OutputPath) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputPath = Join-Path (Get-Location) "liquid-glass-logcat-$timestamp.txt"
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$manufacturer = (& $adb @adbArgs shell getprop ro.product.manufacturer).Trim()
$model = (& $adb @adbArgs shell getprop ro.product.model).Trim()
$androidRelease = (& $adb @adbArgs shell getprop ro.build.version.release).Trim()
$sdk = (& $adb @adbArgs shell getprop ro.build.version.sdk).Trim()

@(
    "Device: $manufacturer $model"
    "Android: $androidRelease (SDK $sdk)"
    "Captured at: $(Get-Date -Format s)"
    ""
) | Set-Content -Path $OutputPath

& $adb @adbArgs logcat -c | Out-Null

Write-Host "Logcat cleared for $manufacturer $model."
Write-Host "Reproduce the liquid glass crash now, then stop this command with Ctrl+C after the app restarts."
Write-Host "Writing to $OutputPath"

& $adb @adbArgs logcat -v threadtime `
    AndroidRuntime:E `
    DEBUG:E `
    ReactNative:V `
    ReactNativeJS:V `
    WindowManager:I `
    ActivityManager:I `
    ViewRootImpl:E `
    OpenGLRenderer:W `
    SurfaceFlinger:W `
    libc:F `
    crash_dump64:E `
    tombstoned:E `
    "*:S" 2>&1 | Tee-Object -FilePath $OutputPath -Append
