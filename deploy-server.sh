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

# 4. 检查是否需要执行数据库迁移
echo "检查数据库迁移状态..."
if [ ! -f ".migration_completed" ]; then
    echo "执行数据库迁移..."
    # 注意：需要手动在Supabase控制台执行database/nb_template_migration.sql
    echo "请在Supabase控制台执行 database/nb_template_migration.sql"
    echo "执行完成后创建标记文件："
    echo "touch .migration_completed"
else
    echo "数据库迁移已完成，跳过"
fi

# 5. 更新server/.env文件
echo "检查server/.env配置..."
if ! grep -q "SUPABASE_URL=" server/.env; then
    echo "添加SUPABASE_URL到server/.env..."
    echo "" >> server/.env
    echo "# Supabase配置" >> server/.env
    echo "SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co" >> server/.env
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc" >> server/.env
fi

# 6. 检查前端.env配置
echo "检查前端.env配置..."
if [ ! -f ".env" ]; then
    echo "创建前端.env文件..."
    cat > .env << EOF
# 前端环境变量
VITE_API_BASE_URL=/api
VITE_USE_SERVER_GENERATION=true
VITE_SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc
EOF
else
    # 更新现有.env文件
    if ! grep -q "VITE_API_BASE_URL=/api" .env; then
        sed -i 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=/api|' .env
    fi
fi

# 7. 安装依赖
echo "安装前端依赖..."
npm install

echo "安装后端依赖..."
cd server && npm install && cd ..

# 8. 构建前端
echo "构建前端..."
npm run build

# 9. 停止现有服务
echo "停止现有服务..."
pkill -f "node.*server.js" || true
pkill -f "npm.*dev" || true
pkill -f "vite" || true

# 等待进程完全停止
sleep 3

# 10. 启动后端服务
echo "启动后端服务..."
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..

# 11. 启动前端服务
echo "启动前端服务..."
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &

# 12. 等待服务启动
echo "等待服务启动..."
sleep 10

# 13. 检查服务状态
echo "检查服务状态..."
echo "后端健康检查:"
curl -s http://localhost:3002/health || echo "后端未启动"

echo "前端状态检查:"
curl -I http://localhost:8889 2>/dev/null | head -1 || echo "前端未启动"

echo "模板API测试:"
curl -s "http://localhost:8889/api/templates?limit=1" | head -20 || echo "API测试失败"

echo "=== 部署完成 ==="
echo "请检查以下URL:"
echo "- 前端: https://nanobanana.gitagent.io"
echo "- 后端健康检查: https://nanobanana.gitagent.io/api/health"
echo "- 模板API: https://nanobanana.gitagent.io/api/templates"
