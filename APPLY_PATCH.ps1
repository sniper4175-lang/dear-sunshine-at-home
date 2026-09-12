param(
    [string]$ProjectPath = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($text) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor DarkGray
    Write-Host $text -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor DarkGray
}

$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PatchFiles = Join-Path $PatchRoot "patch-files"

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {

    # 1) 패치 폴더 자체가 프로젝트 루트에 풀려 있는 경우
    if (Test-Path (Join-Path $PatchRoot "package.json")) {
        $ProjectPath = $PatchRoot
    }
    # 2) 패치 폴더의 한 단계 위가 프로젝트 루트인 경우
    elseif (Test-Path (Join-Path (Split-Path $PatchRoot -Parent) "package.json")) {
        $ProjectPath = Split-Path $PatchRoot -Parent
    }
    # 3) 현재 PowerShell 위치가 프로젝트 루트인 경우
    elseif (Test-Path (Join-Path (Get-Location) "package.json")) {
        $ProjectPath = (Get-Location).Path
    }
    else {
        Write-Host ""
        Write-Host "Dear Sunshine 프로젝트 폴더를 이 창으로 끌어다 놓고 Enter를 누르세요." -ForegroundColor Yellow
        Write-Host "예: C:\Users\name\Downloads\dear-sunshine-at-home" -ForegroundColor DarkGray
        $ProjectPath = Read-Host "프로젝트 폴더"
    }
}

$ProjectPath = $ProjectPath.Trim().Trim('"')

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
    Write-Host ""
    Write-Host "오류: 선택한 폴더에서 package.json을 찾지 못했습니다." -ForegroundColor Red
    Write-Host "프로젝트 최상위 폴더를 선택해야 합니다." -ForegroundColor Red
    Read-Host "Enter를 누르면 종료합니다"
    exit 1
}

$LayoutPath = Join-Path $ProjectPath "app\layout.js"

if (-not (Test-Path $LayoutPath)) {
    Write-Host ""
    Write-Host "오류: app\layout.js를 찾지 못했습니다." -ForegroundColor Red
    Write-Host "현재 프로젝트 구조를 확인해주세요." -ForegroundColor Red
    Read-Host "Enter를 누르면 종료합니다"
    exit 1
}

Write-Step "1/4 기존 파일 백업"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupRoot = Join-Path $ProjectPath "_patch_backup_$Timestamp"

$Targets = @(
    "app\privacy\page.js",
    "app\terms\page.js",
    "app\subscription-policy\page.js",
    "components\SiteFooter.js",
    "app\layout.js"
)

foreach ($relative in $Targets) {
    $source = Join-Path $ProjectPath $relative

    if (Test-Path $source) {
        $backup = Join-Path $BackupRoot $relative
        $backupDir = Split-Path -Parent $backup
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item -Force $source $backup
    }
}

Write-Host "백업 위치: $BackupRoot" -ForegroundColor Green


Write-Step "2/4 정책 페이지와 Footer 복사"

$CopyTargets = @(
    "app\privacy\page.js",
    "app\terms\page.js",
    "app\subscription-policy\page.js",
    "components\SiteFooter.js"
)

foreach ($relative in $CopyTargets) {
    $source = Join-Path $PatchFiles $relative
    $destination = Join-Path $ProjectPath $relative
    $destinationDir = Split-Path -Parent $destination

    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    Copy-Item -Force $source $destination

    Write-Host "적용: $relative" -ForegroundColor Green
}


Write-Step "3/4 app/layout.js에 Footer 자동 연결"

$layout = Get-Content -Raw -Encoding UTF8 $LayoutPath

$importLine = "import SiteFooter from '../components/SiteFooter';"

if ($layout -notmatch "SiteFooter\s+from\s+['""]\.\./components/SiteFooter['""]") {

    # 'use client'가 있다면 그 다음 줄에 import를 넣고,
    # 없으면 파일 맨 위에 넣습니다.
    if ($layout -match "^\s*(['""])use client\1\s*;?") {
        $layout = [regex]::Replace(
            $layout,
            "^(\s*(['""])use client\2\s*;?)",
            "`$1`r`n`r`n$importLine",
            1
        )
    }
    else {
        $layout = $importLine + "`r`n" + $layout
    }

    Write-Host "SiteFooter import 추가 완료" -ForegroundColor Green
}
else {
    Write-Host "SiteFooter import가 이미 있어 건너뜁니다." -ForegroundColor DarkGray
}


if ($layout -notmatch "<SiteFooter\s*/>") {

    if ($layout -match "\{children\}") {
        $layout = [regex]::Replace(
            $layout,
            "\{children\}",
            "{children}`r`n`r`n                <SiteFooter />",
            1
        )

        Write-Host "<SiteFooter /> 연결 완료" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "주의: layout.js에서 {children} 위치를 자동으로 찾지 못했습니다." -ForegroundColor Yellow
        Write-Host "정책 페이지는 복사되었지만 Footer 연결은 직접 확인해야 합니다." -ForegroundColor Yellow
    }
}
else {
    Write-Host "<SiteFooter />가 이미 있어 건너뜁니다." -ForegroundColor DarkGray
}

Set-Content -Path $LayoutPath -Value $layout -Encoding UTF8


Write-Step "4/4 패치 완료"

Write-Host "적용된 파일:" -ForegroundColor White
Write-Host " - app\privacy\page.js"
Write-Host " - app\terms\page.js"
Write-Host " - app\subscription-policy\page.js"
Write-Host " - components\SiteFooter.js"
Write-Host " - app\layout.js (Footer 연결)"
Write-Host ""
Write-Host "기존 파일 백업:" -ForegroundColor White
Write-Host " $BackupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor White
Write-Host " 1. VS Code에서 프로젝트를 엽니다."
Write-Host " 2. 터미널에서 npm run build 를 실행합니다."
Write-Host " 3. 성공하면 git add . / git commit / git push 합니다."
Write-Host ""
Write-Host "확인 주소:" -ForegroundColor White
Write-Host " /privacy"
Write-Host " /terms"
Write-Host " /subscription-policy"
Write-Host ""
Write-Host "무료체험/자동결제 문구는 이번 정책 페이지에서 제거되어 있습니다." -ForegroundColor Green
Write-Host ""

Read-Host "Enter를 누르면 창을 닫습니다"
