#!/bin/bash
# 服务器502错误完整修复脚本

echo "=== AicePS 服务器502错误修复 ==="
echo "开始时间: $(date)"

# 0. 确保在正确的目录
cd /home/ec2-user/nanobanana || {
    echo "❌ 无法进入项目目录 /home/ec2-user/nanobanana"
    exit 1
}

echo "✅ 当前目录: $(pwd)"

# 1. 停止所有相关进程
echo -e "\n1. 停止现有进程..."
pkill -f "node.*server.js" && echo "✅ 停止了 node server.js" || echo "ℹ️  没有运行的 node server.js 进程"
pkill -f "netlify" && echo "✅ 停止了 netlify 进程" || echo "ℹ️  没有运行的 netlify 进程"
pkill -f "npm.*dev" && echo "✅ 停止了 npm dev 进程" || echo "ℹ️  没有运行的 npm dev 进程"

# 等待进程完全停止
sleep 3

# 2. 拉取最新代码
echo -e "\n2. 拉取最新代码..."
git stash > /dev/null 2>&1 || true
git pull origin main || {
    echo "❌ Git pull 失败"
    exit 1
}
echo "✅ 代码更新完成"

# 3. 检查和修复Nginx配置
echo -e "\n3. 检查Nginx配置..."
NGINX_CONFIG="/etc/nginx/sites-available/nanobanana.gitagent.io"

if [ -f "$NGINX_CONFIG" ]; then
    if grep -q "localhost:8890" "$NGINX_CONFIG"; then
        echo "⚠️  发现错误的代理端口8890，修复为8889..."
        sudo sed -i 's/localhost:8890/localhost:8889/g' "$NGINX_CONFIG"
        sudo systemctl reload nginx
        echo "✅ Nginx配置已修复并重新加载"
    elif grep -q "localhost:8889" "$NGINX_CONFIG"; then
        echo "✅ Nginx代理端口配置正确 (8889)"
    else
        echo "❌ 未找到代理配置，请检查Nginx配置文件"
    fi
else
    echo "❌ Nginx配置文件不存在: $NGINX_CONFIG"
fi

# 4. 确保环境变量文件存在
echo -e "\n4. 检查环境变量..."
if [ ! -f "server/.env" ]; then
    echo "⚠️  创建 server/.env 文件..."
    cat > server/.env << 'EOF'
PORT=3002
NODE_ENV=production
SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc
EOF
    echo "✅ 环境变量文件已创建"
else
    echo "✅ 环境变量文件已存在"
fi

# 5. 安装依赖（如果需要）
echo -e "\n5. 检查依赖..."
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ]; then
    echo "⚠️  安装依赖..."
    npm install > /dev/null 2>&1 || echo "❌ 前端依赖安装失败"
    cd server && npm install > /dev/null 2>&1 || echo "❌ 后端依赖安装失败"
    cd ..
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在"
fi

# 6. 启动后端服务
echo -e "\n6. 启动后端服务..."
cd server
if [ -f "server.js" ]; then
    # 使用nohup启动后端，输出到日志文件
    nohup node server.js > ../server.log 2>&1 &
    BACKEND_PID=$!
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
    cd ..
    
    # 等待后端启动
    echo "⏳ 等待后端服务启动..."
    sleep 5
    
    # 检查后端健康状态
    if curl -s --connect-timeout 10 http://localhost:3002/health > /dev/null; then
        echo "✅ 后端服务健康检查通过"
    else
        echo "❌ 后端服务健康检查失败"
        echo "后端日志:"
        tail -10 server.log
    fi
else
    echo "❌ server.js 文件不存在"
    cd ..
    exit 1
fi

# 7. 启动前端服务
echo -e "\n7. 启动前端服务..."
if [ -f "package.json" ]; then
    # 检查vite.config.ts中是否配置了端口
    if grep -q "port.*8889" vite.config.ts 2>/dev/null; then
        echo "使用 npm run dev 启动前端..."
        nohup npm run dev > frontend.log 2>&1 &
    else
        echo "使用 netlify dev 启动前端..."
        nohup npx netlify dev --port 8889 > frontend.log 2>&1 &
    fi
    FRONTEND_PID=$!
    echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
    
    # 等待前端启动
    echo "⏳ 等待前端服务启动..."
    sleep 10
    
    # 检查前端状态
    if curl -s --connect-timeout 10 -I http://localhost:8889 > /dev/null; then
        echo "✅ 前端服务启动成功"
    else
        echo "❌ 前端服务启动失败"
        echo "前端日志:"
        tail -10 frontend.log
    fi
else
    echo "❌ package.json 文件不存在"
    exit 1
fi

# 8. 最终验证
echo -e "\n8. 最终验证..."
echo "端口检查:"
netstat -tlnp | grep -E ":(8889|3002)" || echo "❌ 端口检查失败"

echo -e "\n服务健康检查:"
echo "后端健康检查:"
curl -s --connect-timeout 5 http://localhost:3002/health && echo "" || echo "❌ 后端检查失败"

echo "前端状态检查:"
curl -s --connect-timeout 5 -I http://localhost:8889 2>/dev/null | head -1 || echo "❌ 前端检查失败"

echo "API代理检查:"
curl -s --connect-timeout 5 "http://localhost:8889/api/templates?limit=1" > /dev/null && echo "✅ API代理正常" || echo "❌ API代理检查失败"

# 9. 显示进程信息
echo -e "\n9. 当前运行的进程:"
ps aux | grep -E "(node|npm|netlify)" | grep -v grep || echo "❌ 没有找到相关进程"

echo -e "\n=== 修复完成 ==="
echo "完成时间: $(date)"
echo ""
echo "📋 服务状态总结:"
echo "- 后端服务: http://localhost:3002 (健康检查: /health)"
echo "- 前端服务: http://localhost:8889"
echo "- 网站访问: https://nanobanana.gitagent.io"
echo ""
echo "📁 日志文件:"
echo "- 后端日志: tail -f server.log"
echo "- 前端日志: tail -f frontend.log"
echo "- Nginx日志: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔧 如果问题仍然存在，请检查日志文件获取详细错误信息"
