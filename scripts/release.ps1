# Cap (CN) - Release Script (PowerShell)
# 自动读取 apps/desktop/src-tauri/Cargo.toml 的版本号，创建并推送 v<x.y.z> tag，
# 推送后由 GitHub Actions (build-desktop.yml) 自动构建并发布到 Releases 页面。
#
# 用法（在仓库根目录或任意目录均可）：
#   pwsh scripts/release.ps1            # 使用 Cargo.toml 中的版本号
#   pwsh scripts/release.ps1 0.5.3      # 手动指定版本号，覆盖 Cargo.toml

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Cap (CN) - Release Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1) 工作区必须干净
$status = git status --porcelain
if ($status) {
    Write-Host "工作区有未提交改动，请先 commit 或 stash 再发版：" -ForegroundColor Red
    Write-Host $status
    exit 1
}

# 2) 从 Cargo.toml 读取版本号（取列 0 的 `version = "..."`，即 [package] 段的包版本）
$cargoPath = Join-Path $repoRoot "apps\desktop\src-tauri\Cargo.toml"
if (-not (Test-Path $cargoPath)) {
    Write-Host "未找到 $cargoPath" -ForegroundColor Red
    exit 1
}
$cargoVersion = $null
foreach ($line in Get-Content $cargoPath) {
    if ($line -match '^\s*version\s*=\s*"([^"]+)"') {
        $cargoVersion = $matches[1]
        break
    }
}
if (-not $cargoVersion) {
    Write-Host "未能从 Cargo.toml 解析到版本号" -ForegroundColor Red
    exit 1
}

# 3) 确定本次发版版本号
if (-not $Version) {
    $Version = $cargoVersion
    Write-Host "检测到 Cargo.toml 版本号：$cargoVersion" -ForegroundColor Green
    $ans = Read-Host "使用该版本号发布 v$cargoVersion？(Y/n)"
    if ($ans -and $ans -notmatch '^[yY]') {
        $Version = Read-Host "请输入版本号 (如 0.5.3)"
    }
}

# 4) 去掉可能误输入的 v 前缀
if ($Version -match '^[vV]') { $Version = $Version.Substring(1) }

# 5) 校验格式 x.y.z（可带预发布后缀，如 -rc.1）
if ($Version -notmatch '^\d+\.\d+\.\d+') {
    Write-Host "版本号格式不正确，应为 x.y.z（例如 0.5.2）。输入的是：$Version" -ForegroundColor Red
    exit 1
}

# 6) tag 是否已存在
$existing = git rev-parse -q --verify "refs/tags/v$Version" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "tag v$Version 已存在，请更换版本号或先删除旧 tag (git tag -d v$Version)" -ForegroundColor Red
    exit 1
}

# 7) 与 Cargo.toml 不一致时提醒（不阻断）
if ($Version -ne $cargoVersion) {
    Write-Host "提示：输入版本号 v$Version 与 Cargo.toml ($cargoVersion) 不一致。" -ForegroundColor Yellow
    Write-Host "      这会导致安装包文件名版本与 tag 不匹配，建议先改 Cargo.toml 再发版。" -ForegroundColor Yellow
    $confirm = Read-Host "仍要继续？(y/N)"
    if ($confirm -notmatch '^[yY]') { exit 0 }
}

Write-Host ""
Write-Host "当前 HEAD：" -ForegroundColor DarkGray
git log -1 --oneline
Write-Host ""
Write-Host "即将发布版本：v$Version" -ForegroundColor Green
Write-Host ""

# 8) 创建并推送带附注的 tag
git tag -a "v$Version" -m "Release v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "创建 Git Tag 失败" -ForegroundColor Red
    exit 1
}
Write-Host "已创建 tag v$Version" -ForegroundColor Green

git push origin "v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "推送 Tag 到远程仓库失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "发布成功！v$Version 已推送。" -ForegroundColor Green
Write-Host "GitHub Actions 将自动构建并发布到 Releases 页面。" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
