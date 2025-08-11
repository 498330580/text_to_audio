@echo off
chcp 65001 >nul
echo ========================================
echo    CosyVoice语音合成器 - 启动脚本
echo ========================================
echo.

echo 正在检查依赖...
if not exist "node_modules" (
    echo [警告] 未检测到node_modules文件夹
    echo 请先运行 install.bat 安装依赖
    pause
    exit /b 1
)

echo [✓] 依赖检查通过
echo.

echo 正在启动CosyVoice语音合成器...
echo 请稍候，应用窗口即将打开...
echo.
echo 提示: 按 Ctrl+C 可以停止应用
echo.

npm start

echo.
echo 应用已关闭
pause