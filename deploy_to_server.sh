#!/bin/bash

# AicePS 服务器部署脚本
# 请在服务器上手动执行此脚本

echo "=== AicePS 服务器部署开始 ==="

# 1. 进入项目目录
cd /home/ec2-user/nanobanana

# 2. 备份当前更改
echo "备份当前更改..."
git stash

# 3. 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 4. 检查环境变量
echo "检查后台环境变量..."
if [ ! -f "server/.env" ]; then
    echo "错误: server/.env 文件不存在"
    exit 1
fi

# 检查必要的环境变量
if ! grep -q "SUPABASE_URL=" server/.env; then
    echo "添加SUPABASE_URL到server/.env..."
    echo "" >> server/.env
    echo "# Supabase配置" >> server/.env
    echo "SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co" >> server/.env
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc" >> server/.env
fi

# 5. 停止现有服务
echo "停止现有服务..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# 等待进程完全停止
sleep 3

# 6. 启动后台服务
echo "启动后台服务..."
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..

# 等待后台服务启动
sleep 5

# 7. 检查后台服务状态
if curl -s http://localhost:3002/health | grep -q "ok"; then
    echo "✅ 后台服务启动成功"
else
    echo "❌ 后台服务启动失败"
    tail -20 server.log
    exit 1
fi

# 8. 启动前端服务
echo "启动前端服务..."
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &

# 等待前端服务启动
sleep 10

# 9. 检查前端服务状态
if curl -s http://localhost:8889 | grep -q "Aice PS"; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败"
    tail -20 frontend.log
    exit 1
fi

# 10. 测试模板API
echo "测试模板API..."
API_RESPONSE=$(curl -s "http://localhost:8889/api/templates?limit=1")
if echo "$API_RESPONSE" | grep -q "nb_templates"; then
    echo "✅ 模板API测试成功 - 已切换到数据库模式"
    echo "返回的模板数据:"
    echo "$API_RESPONSE" | head -5
else
    echo "❌ 模板API测试失败"
    echo "API响应: $API_RESPONSE"
fi

# 11. 检查Nginx代理
echo "检查Nginx代理..."
if curl -s -I https://nanobanana.gitagent.io | grep -q "200 OK"; then
    echo "✅ Nginx代理正常"
else
    echo "⚠️  Nginx代理可能需要检查"
fi

echo "=== 部署完成 ==="
echo ""
echo "服务状态:"
echo "- 后台服务: http://localhost:3002"
echo "- 前端服务: http://localhost:8889" 
echo "- 生产地址: https://nanobanana.gitagent.io"
echo ""
echo "测试命令:"
echo "curl -s 'http://localhost:3002/api/templates?limit=1' | head -10"
echo "curl -s 'http://localhost:8889/api/templates?limit=1' | head -10"
