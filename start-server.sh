#!/bin/bash

# AicePS 服务器启动脚本

echo "=== AicePS 服务器启动脚本 ==="

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

# 进入服务器目录
cd server

# 检查服务器依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "安装服务器依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败。"
        exit 1
    fi
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到 .env 文件，复制示例配置..."
    cp .env.example .env
    echo "请编辑 server/.env 文件配置您的 GEMINI_API_KEY"
fi

# 检查端口是否被占用
PORT=${PORT:-3001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "警告: 端口 $PORT 已被占用，尝试终止占用进程..."
    kill -9 $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 2
fi

echo "启动 AicePS 服务器（端口 $PORT）..."
echo "服务器日志将显示在下方，按 Ctrl+C 停止服务器"
echo "========================================"

# 启动服务器
npm start