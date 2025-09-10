#!/bin/bash

# AicePS 开发环境启动脚本（同时启动前端和后端）

echo "=== AicePS 开发环境启动脚本 ==="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装。请先安装 Node.js。"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本。"
    exit 1
fi

# 安装前端依赖
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 安装后端依赖
cd server
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 检查后端 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到服务器 .env 文件，复制示例配置..."
    cp .env.example .env
    echo "请编辑 server/.env 文件配置您的 GEMINI_API_KEY"
fi

cd ..

# 检查前端 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到前端 .env 文件，复制示例配置..."
    cp .env.example .env
fi

# 检查端口占用
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "警告: 端口 3001 已被占用，尝试终止占用进程..."
    kill -9 $(lsof -Pi :3001 -sTCP:LISTEN -t) 2>/dev/null || true
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "警告: 端口 5173 已被占用，尝试终止占用进程..."
    kill -9 $(lsof -Pi :5173 -sTCP:LISTEN -t) 2>/dev/null || true
fi

echo "启动开发环境..."
echo "- 后端服务器: http://localhost:3001"
echo "- 前端开发服务器: http://localhost:5173"
echo "按 Ctrl+C 停止所有服务"
echo "========================================"

# 启动后端服务器（后台运行）
cd server
npm start &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 返回根目录启动前端
cd ..
npm run dev &
FRONTEND_PID=$!

# 等待用户中断
wait

# 清理后台进程
echo "正在停止服务..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
echo "服务已停止"