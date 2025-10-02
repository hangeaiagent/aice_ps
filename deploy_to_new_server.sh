#!/bin/bash

# AicePS 新服务器部署脚本
# 服务器IP: 98.90.28.95
# 执行方式: ssh -i /Users/a1/work/productmindai.pem ec2-user@98.90.28.95 'bash -s' < deploy_to_new_server.sh

echo "=== AicePS 服务器更新开始 ==="
echo "服务器IP: 98.90.28.95"
echo "更新时间: $(date)"

# 1. 进入项目目录
cd /home/ec2-user/nanobanana || { echo "项目目录不存在"; exit 1; }

echo "当前目录: $(pwd)"

# 2. 备份当前更改
echo "备份当前更改..."
git stash

# 3. 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 4. 清理 Vite 构建缓存
echo "清理 Vite 构建缓存..."
rm -rf node_modules/.vite
rm -rf .vite

# 5. 重新构建项目
echo "重新构建项目..."
npm run build

# 6. 停止现有服务
echo "停止现有服务..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "netlify" 2>/dev/null || true

# 等待进程完全停止
sleep 3

# 7. 启动后台服务
echo "启动后台服务..."
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..

# 等待后台服务启动
sleep 5

# 8. 检查后台服务状态
if curl -s http://localhost:3002/health | grep -q "ok"; then
    echo "✅ 后台服务启动成功"
else
    echo "❌ 后台服务启动失败，查看日志:"
    tail -20 server.log
fi

# 9. 启动前端服务
echo "启动前端服务..."
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &

# 等待前端服务启动
sleep 10

# 10. 检查前端服务状态
if curl -s http://localhost:8889 > /dev/null 2>&1; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败，查看日志:"
    tail -20 frontend.log
fi

# 11. 显示服务状态
echo ""
echo "=== 部署完成 ==="
echo ""
echo "服务状态:"
echo "- 后台服务: http://localhost:3002"
echo "- 前端服务: http://localhost:8889"
echo "- 生产地址: https://nanobanana.gitagent.io"
echo ""
echo "检查运行中的进程:"
ps aux | grep -E "node|vite|netlify" | grep -v grep

