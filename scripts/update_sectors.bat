@echo off
chcp 65001 >nul
echo ============================================
echo Sonata 板块数据更新工具
echo ============================================
echo.

cd /d "%~dp0\.."

echo [INFO] 开始更新板块数据...
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未找到Python，请安装Python 3.x
    pause
    exit /b 1
)

REM 执行更新脚本
echo [INFO] 执行更新脚本...
python scripts/update_sectors.py

if errorlevel 1 (
    echo [ERROR] 更新失败
    pause
    exit /b 1
)

echo.
echo [SUCCESS] 更新完成！
echo [INFO] 请刷新网页查看更新后的板块数据
echo.
pause
