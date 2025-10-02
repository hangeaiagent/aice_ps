#!/bin/bash

# 修复服务器部署问题
echo "=== 修复服务器部署问题 ==="

cd /home/ec2-user/nanobanana || exit 1

# 1. 移除冲突文件
echo "移除冲突文件..."
rm -f three_projects_monitor.sh
rm -f unified_three_projects_manager.sh

# 2. 强制拉取最新代码
echo "强制拉取最新代码..."
git fetch origin main
git reset --hard origin/main

# 3. 确保 SimpleTextToComicPage 文件存在
if [ ! -f "components/SimpleTextToComicPage.tsx" ]; then
    echo "❌ SimpleTextToComicPage.tsx 文件不存在!"
    exit 1
else
    echo "✅ SimpleTextToComicPage.tsx 文件存在"
fi

# 4. 清理所有缓存
echo "清理所有缓存..."
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

# 5. 重新构建
echo "重新构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

# 6. 重启服务
echo "重启服务..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "netlify" 2>/dev/null || true

sleep 3

# 启动后台服务
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..

sleep 5

# 启动前端服务
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &

sleep 10

echo ""
echo "=== 修复完成 ==="
echo ""
echo "服务状态检查:"
curl -s http://localhost:3002/health && echo "✅ 后台服务正常" || echo "❌ 后台服务异常"
curl -s http://localhost:8889 > /dev/null && echo "✅ 前端服务正常" || echo "❌ 前端服务异常"

