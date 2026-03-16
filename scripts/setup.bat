@echo off
chcp 65001 >nul
echo ========================================
echo Sonata V2.5 环境设置脚本
echo ========================================
echo.

REM 检查 Node.js
echo 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装，请先安装 Node.js 18+
    exit /b 1
)
echo [OK] Node.js 已安装

REM 检查 Python
echo.
echo 检查 Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Python 未安装，请先安装 Python 3.9+
    exit /b 1
)
echo [OK] Python 已安装

REM 安装前端依赖
echo.
echo 安装前端依赖...
call npm install
if errorlevel 1 (
    echo [错误] 前端依赖安装失败
    exit /b 1
)
echo [OK] 前端依赖安装完成

REM 安装后端依赖
echo.
echo 安装后端依赖...
cd backend
call pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] 后端依赖安装失败
    exit /b 1
)
cd ..
echo [OK] 后端依赖安装完成

REM 安装测试依赖
echo.
echo 安装测试依赖...
call npm install --save-dev @types/jest jest jest-environment-jsdom ts-jest @types/supertest supertest identity-obj-proxy
if errorlevel 1 (
    echo [警告] 测试依赖安装失败，可稍后手动安装
)
echo [OK] 测试依赖安装完成

echo.
echo ========================================
echo 环境设置完成！
echo.
echo 可用命令：
echo   npm run dev          - 启动前端开发服务器
echo   npm run build        - 构建生产版本
echo   npm test             - 运行单元测试
echo   npm run test:coverage- 运行测试并生成覆盖率报告
echo.
echo   cd backend ^&^& python app.py - 启动后端服务
echo   docker-compose up -d - 使用 Docker 启动所有服务
echo ========================================
