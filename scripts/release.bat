@echo off
setlocal enabledelayedexpansion

echo ====================================
echo Cap (CN) - Release Script
echo ====================================
echo.

REM 1) 工作区必须干净，避免把未提交改动悄悄打进 tag
git diff --quiet --exit-code
if errorlevel 1 (
    echo Error: 工作区有未提交改动，请先 commit 或 stash 再发版
    pause
    exit /b 1
)
git diff --cached --quiet --exit-code
if errorlevel 1 (
    echo Error: 暂存区有未提交改动，请先 commit 或 stash 再发版
    pause
    exit /b 1
)

set /p version="Please enter version number (e.g., 0.5.2): "

if "%version%"=="" (
    echo Error: 版本号不能为空
    pause
    exit /b 1
)

REM 2) 去掉用户可能误输入的 v 前缀
if /i "%version:~0,1%"=="v" set "version=%version:~1%"

REM 3) 简单校验格式：x.y.z（数字.数字.数字，可带 -rc.1 等后缀）
echo %version%| findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul
if errorlevel 1 (
    echo Error: 版本号格式不正确，应为 x.y.z（例如 0.5.2）
    pause
    exit /b 1
)

REM 4) 检查 tag 是否已存在
git rev-parse -q --verify "refs/tags/v%version%" >nul
if not errorlevel 1 (
    echo Error: tag v%version% 已存在，请更换版本号或先删除旧 tag
    pause
    exit /b 1
)

echo.
echo Current HEAD:
git log -1 --oneline
echo.
echo Preparing to release version: v%version%
echo.

REM 5) 创建并推送带附注的 tag（-a），GitHub 上会显示 tag 说明信息
git tag -a "v%version%" -m "Release v%version%"
if errorlevel 1 (
    echo Error: 创建 Git Tag 失败
    pause
    exit /b 1
)

echo Git Tag v%version% created successfully
echo.

git push origin "v%version%"
if errorlevel 1 (
    echo Error: 推送 Tag 到远程仓库失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo Release successful! Version v%version% has been pushed
echo GitHub Actions 会自动构建并发布到 Releases 页面
echo ====================================
pause
