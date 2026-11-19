@echo off
chcp 65001 >nul
cd /d E:\dsh-workbench\cognitive-scaffold
set PORT=3100
echo ================================================
echo    认知脚手架 正在启动...
echo    启动后请在浏览器打开：http://localhost:3100
echo    （关闭本窗口 = 停止服务）
echo ================================================
"C:\Users\NXH\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" "C:\Users\NXH\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs" run dev
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
