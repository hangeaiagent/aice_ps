#!/bin/bash
# 修复502 Bad Gateway错误的脚本

echo "=== 诊断502 Bad Gateway错误 ==="

# 1. 检查端口占用情况
echo "1. 检查端口占用情况:"
echo "端口8889 (前端):"
netstat -tlnp | grep :8889 || echo "端口8889未被占用"

echo "端口3002 (后端):"
netstat -tlnp | grep :3002 || echo "端口3002未被占用"

# 2. 检查进程状态
echo -e "\n2. 检查进程状态:"
echo "Node.js进程:"
ps aux | grep -E "(node.*server|netlify)" | grep -v grep || echo "没有找到相关进程"

# 3. 检查Nginx配置
echo -e "\n3. 检查Nginx配置:"
if [ -f "/etc/nginx/sites-available/nanobanana.gitagent.io" ]; then
    echo "当前Nginx代理配置:"
    grep -A 5 -B 5 "proxy_pass" /etc/nginx/sites-available/nanobanana.gitagent.io
else
    echo "Nginx配置文件不存在"
fi

# 4. 修复步骤
echo -e "\n=== 开始修复 ==="

# 停止所有相关进程
echo "4. 停止现有进程..."
pkill -f "node.*server.js" || true
pkill -f "netlify" || true
pkill -f "vite" || true
sleep 3

# 检查并修复Nginx配置
echo "5. 检查Nginx配置..."
if grep -q "localhost:8890" /etc/nginx/sites-available/nanobanana.gitagent.io 2>/dev/null; then
    echo "发现错误的代理端口8890，修复为8889..."
    sudo sed -i 's/localhost:8890/localhost:8889/g' /etc/nginx/sites-available/nanobanana.gitagent.io
    sudo systemctl reload nginx
    echo "Nginx配置已修复并重新加载"
else
    echo "Nginx配置正确或文件不存在"
fi

# 启动后端服务
echo "6. 启动后端服务..."
cd /home/ec2-user/nanobanana/server
if [ -f "server.js" ]; then
    nohup node server.js > ../server.log 2>&1 &
    echo "后端服务已启动"
    cd ..
else
    echo "错误: server.js文件不存在"
    cd ..
fi

# 等待后端启动
sleep 5

# 检查后端健康状态
echo "7. 检查后端健康状态..."
curl -s http://localhost:3002/health || echo "后端健康检查失败"

# 启动前端服务
echo "8. 启动前端服务..."
if [ -f "package.json" ]; then
    # 检查vite.config.ts中的端口配置
    if grep -q "port: 8889" vite.config.ts 2>/dev/null; then
        echo "使用npm run dev启动前端..."
        nohup npm run dev > frontend.log 2>&1 &
    else
        echo "使用netlify dev启动前端..."
        nohup npx netlify dev --port 8889 > frontend.log 2>&1 &
    fi
    echo "前端服务已启动"
else
    echo "错误: package.json文件不存在"
fi

# 等待前端启动
sleep 10

# 最终检查
echo -e "\n=== 最终检查 ==="
echo "9. 端口检查:"
netstat -tlnp | grep -E ":(8889|3002)"

echo -e "\n10. 服务健康检查:"
echo "后端健康检查:"
curl -s http://localhost:3002/health && echo "" || echo "后端检查失败"

echo "前端状态检查:"
curl -I http://localhost:8889 2>/dev/null | head -1 || echo "前端检查失败"

echo "API代理检查:"
curl -s "http://localhost:8889/api/templates?limit=1" | head -10 || echo "API代理检查失败"

echo -e "\n=== 修复完成 ==="
echo "如果问题仍然存在，请检查日志文件:"
echo "- 后端日志: tail -f server.log"
echo "- 前端日志: tail -f frontend.log"
echo "- Nginx日志: sudo tail -f /var/log/nginx/error.log"
