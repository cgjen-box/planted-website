# Chrome Debug Mode Launcher (PowerShell version)
# Launches Chrome with remote debugging enabled for Website Review Capability

param(
    [int]$Port = 9222,
    [string]$ProfileDir = "$env:USERPROFILE\.chrome-debug-profile"
)

$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Create profile directory if it doesn't exist
if (-not (Test-Path $ProfileDir)) {
    New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null
    Write-Host "Created profile directory: $ProfileDir" -ForegroundColor Green
}

# Check if Chrome is already running on the debug port
$existingConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($existingConnection) {
    Write-Host "Chrome debug instance already running on port $Port" -ForegroundColor Yellow
    Write-Host "Connect with: --browserUrl=http://127.0.0.1:$Port"
    return
}

Write-Host "Starting Chrome with remote debugging..." -ForegroundColor Cyan
Write-Host "Profile: $ProfileDir"
Write-Host "Port: $Port"

$chromeArgs = @(
    "--remote-debugging-port=$Port"
    "--user-data-dir=$ProfileDir"
    "--no-first-run"
    "--no-default-browser-check"
    "--disable-features=Translate"
    "--disable-popup-blocking"
    "--disable-infobars"
)

Start-Process -FilePath $ChromePath -ArgumentList $chromeArgs

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Chrome started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:"
Write-Host "  1. Login to admin.planted.com in the Chrome window (for production auth)"
Write-Host "  2. Run website reviews with: /review-website [local|admin|prod]"
Write-Host "  3. Your auth state will persist across sessions"
Write-Host ""
Write-Host "Profile directory: $ProfileDir"
Write-Host "Debug URL: http://127.0.0.1:$Port"
