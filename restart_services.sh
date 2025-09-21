#!/bin/bash

# 服务重启脚本 - 解决502错误和端口冲突
# 功能: 彻底清理端口占用，重启所有服务

set -e

echo "🔄 开始重启服务，解决502错误..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SERVER_HOST="54.89.140.250"
SERVER_USER="ec2-user"
KEY_PATH="/Users/a1/work/productmindai.pem"
PROJECT_DIR="/home/ec2-user/nanobanana"

# 函数: 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🔍 步骤1: 检查当前服务状态..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "=== 当前运行的服务 ==="
ps aux | grep -E "(node|netlify|npm)" | grep -v grep || echo "没有找到相关服务"

echo ""
echo "=== 端口占用情况 ==="
netstat -tlnp 2>/dev/null | grep -E ":(3001|8888|8889|8890|8891|5173)" || echo "没有找到相关端口占用"

echo ""
echo "=== 检查日志文件 ==="
ls -la *.log 2>/dev/null || echo "没有找到日志文件"
EOF

print_message "🛑 步骤2: 彻底停止所有服务..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "停止所有相关进程..."
# 停止 netlify dev
pkill -f "netlify dev" || true
pkill -f "npx netlify" || true

# 停止 node server.js
pkill -f "node server.js" || true
pkill -f "server/server.js" || true

# 停止所有npm进程
pkill -f "npm exec" || true

# 强制杀死可能残留的进程
ps aux | grep -E "(netlify|node.*server)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

echo "等待进程完全停止..."
sleep 5

echo "验证进程已停止..."
ps aux | grep -E "(netlify|node.*server)" | grep -v grep || echo "✅ 所有服务已停止"
EOF

print_message "🔧 步骤3: 清理临时文件和缓存..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "清理日志文件..."
rm -f *.log

echo "清理node_modules缓存..."
rm -rf .netlify
rm -rf node_modules/.cache

echo "清理临时文件..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "✅ 清理完成"
EOF

print_message "📦 步骤4: 重新安装依赖..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "检查package.json..."
if [ -f package.json ]; then
    echo "✅ package.json存在"
else
    echo "❌ package.json不存在"
    exit 1
fi

echo "重新安装npm依赖..."
npm install --no-optional

echo "检查关键依赖..."
npm list @heroicons/react || echo "⚠️ @heroicons/react可能需要重新安装"
npm list @supabase/supabase-js || echo "⚠️ @supabase/supabase-js可能需要重新安装"

echo "✅ 依赖安装完成"
EOF

print_message "🚀 步骤5: 启动后端服务..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "检查后端服务文件..."
if [ -f server/server.js ]; then
    echo "✅ server/server.js存在"
else
    echo "❌ server/server.js不存在"
    exit 1
fi

echo "启动后端服务..."
nohup node server/server.js > backend.log 2>&1 &
BACKEND_PID=$!

echo "后端服务PID: $BACKEND_PID"
sleep 3

echo "检查后端服务状态..."
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务启动成功"
    echo "检查端口3001..."
    netstat -tlnp 2>/dev/null | grep ":3001" || echo "⚠️ 端口3001可能未监听"
else
    echo "❌ 后端服务启动失败"
    echo "查看错误日志:"
    tail -10 backend.log
    exit 1
fi
EOF

print_message "🌐 步骤6: 启动前端服务..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "启动前端服务..."
nohup npx netlify dev --port 8888 > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "前端服务PID: $FRONTEND_PID"
sleep 10

echo "检查前端服务状态..."
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败"
    echo "查看错误日志:"
    tail -10 frontend.log
fi

echo "等待前端完全启动..."
sleep 15

echo "检查前端日志..."
tail -5 frontend.log
EOF

print_message "🔍 步骤7: 验证服务状态..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "=== 最终服务状态 ==="
ps aux | grep -E "(node|netlify)" | grep -v grep

echo ""
echo "=== 端口监听状态 ==="
netstat -tlnp 2>/dev/null | grep -E ":(3001|8888|8889|8890|8891)"

echo ""
echo "=== 后端日志 (最后5行) ==="
tail -5 backend.log 2>/dev/null || echo "无后端日志"

echo ""
echo "=== 前端日志 (最后5行) ==="
tail -5 frontend.log 2>/dev/null || echo "无前端日志"
EOF

print_message "🧪 步骤8: 测试API连接..." $YELLOW

echo "等待服务完全启动..."
sleep 10

echo "测试后端健康检查..."
if curl -s --max-time 10 "https://nanobanana.gitagent.io/health" | grep -q "ok"; then
    print_message "✅ 后端API正常" $GREEN
else
    print_message "❌ 后端API异常" $RED
    echo "尝试直接测试..."
    curl -v "https://nanobanana.gitagent.io/health" 2>&1 | head -10
fi

echo ""
echo "测试模板API..."
if curl -s --max-time 10 "https://nanobanana.gitagent.io/api/templates?limit=1" | grep -q "templates"; then
    print_message "✅ 模板API正常" $GREEN
else
    print_message "❌ 模板API异常" $RED
fi

echo ""
echo "测试前端页面..."
if curl -s --max-time 10 "https://nanobanana.gitagent.io" | grep -q "DOCTYPE html"; then
    print_message "✅ 前端页面正常" $GREEN
else
    print_message "❌ 前端页面异常" $RED
fi

print_message "📋 步骤9: 检查Nginx配置..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
echo "检查Nginx配置..."
sudo nginx -t 2>&1 || echo "Nginx配置可能有问题"

echo ""
echo "检查Nginx状态..."
sudo systemctl status nginx --no-pager -l || echo "无法获取Nginx状态"

echo ""
echo "检查Nginx错误日志..."
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "无法访问Nginx错误日志"
EOF

print_message "🎉 服务重启完成!" $GREEN
echo ""
print_message "📊 最终状态总结:" $BLUE
echo "• 网站地址: https://nanobanana.gitagent.io"
echo "• 后端API: https://nanobanana.gitagent.io/api/"
echo "• 健康检查: https://nanobanana.gitagent.io/health"
echo ""
print_message "🔧 如果仍有问题，请检查:" $YELLOW
echo "1. Nginx配置是否正确代理到端口3001"
echo "2. 防火墙是否阻止了端口访问"
echo "3. 服务器资源是否充足"
echo "4. 数据库连接是否正常"
echo ""
print_message "📝 调试命令:" $BLUE
echo "• 查看后端日志: ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST 'tail -f /home/ec2-user/nanobanana/backend.log'"
echo "• 查看前端日志: ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST 'tail -f /home/ec2-user/nanobanana/frontend.log'"
echo "• 查看Nginx日志: ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST 'sudo tail -f /var/log/nginx/error.log'"
