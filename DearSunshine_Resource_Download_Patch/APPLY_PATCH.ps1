$ErrorActionPreference = "Stop"

$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-ProjectRoot {
    $current = Get-Location

    if ((Test-Path (Join-Path $current "package.json")) -and (Test-Path (Join-Path $current "app"))) {
        return $current.Path
    }

    $parent = Split-Path -Parent $PatchRoot

    if ((Test-Path (Join-Path $parent "package.json")) -and (Test-Path (Join-Path $parent "app"))) {
        return $parent
    }

    return $null
}

$ProjectRoot = Find-ProjectRoot

if (-not $ProjectRoot) {
    Write-Host "Dear Sunshine 프로젝트 폴더를 이 창에 끌어다 놓고 Enter를 눌러주세요." -ForegroundColor Yellow
    $ProjectRoot = Read-Host "프로젝트 폴더"
    $ProjectRoot = $ProjectRoot.Trim('"')
}

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    Write-Host "package.json을 찾을 수 없습니다. 프로젝트 폴더가 맞는지 확인해주세요." -ForegroundColor Red
    Read-Host "Enter를 누르면 종료합니다"
    exit 1
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupRoot = Join-Path $ProjectRoot "_patch_backup_resource_download_$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$files = @(
    "components\PrintableButton.js",
    "components\LyricsSheet.js",
    "components\ResourceGallery.js",
    "components\SecureDownloadButton.js",
    "app\api\resource-list\route.js",
    "app\api\resource-file\route.js"
)

foreach ($relative in $files) {
    $destination = Join-Path $ProjectRoot $relative

    if (Test-Path $destination) {
        $backup = Join-Path $BackupRoot $relative
        $backupDir = Split-Path -Parent $backup
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item -Force $destination $backup
    }
}

foreach ($relative in $files) {
    $source = Join-Path $PatchRoot $relative
    $destination = Join-Path $ProjectRoot $relative
    $destinationDir = Split-Path -Parent $destination

    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    Copy-Item -Force $source $destination
}

Write-Host ""
Write-Host "패치 적용 완료!" -ForegroundColor Green
Write-Host "백업 폴더: $BackupRoot"
Write-Host ""
Write-Host "다음 명령을 프로젝트 폴더에서 실행해주세요:" -ForegroundColor Cyan
Write-Host "npm run build"
Write-Host ""
Write-Host "주의: _patch_backup_resource_download_* 폴더는 Git에 올리지 마세요." -ForegroundColor Yellow
Write-Host ""
Read-Host "Enter를 누르면 종료합니다"
