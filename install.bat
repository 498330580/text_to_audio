@echo off
chcp 65001 >nul
echo ========================================
echo    CosyVoice语音合成器 - 安装脚本
echo ========================================
echo.

echo 正在检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js环境
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js环境检查通过
echo.

echo 正在检查npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm不可用
    pause
    exit /b 1
)

echo [✓] npm检查通过
echo.

echo 正在安装项目依赖...
echo 这可能需要几分钟时间，请耐心等待...
echo.

npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    echo 请检查网络连接或尝试使用淘宝镜像:
    echo npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)

echo.
echo ========================================
echo           安装完成！
echo ========================================
echo.
echo 使用方法:
echo   启动应用: npm start
echo   构建应用: npm run build
echo.
echo 首次使用请确保CosyVoice2 API服务正在运行
echo 默认地址: http://127.0.0.1:9933
echo.
pause