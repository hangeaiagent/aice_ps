#!/bin/bash
# 服务器502错误诊断和修复脚本

echo "=== AicePS 服务器502错误诊断 ==="
echo "时间: $(date)"
echo "服务器: nanobanana.gitagent.io"
echo ""

# 1. 检查当前目录和文件
echo "1. 检查项目目录:"
pwd
ls -la | head -10

# 2. 检查端口占用
echo -e "\n2. 检查端口占用:"
echo "前端端口 8889:"
netstat -tlnp | grep :8889 || echo "❌ 端口8889未被占用"

echo "后端端口 3002:"
netstat -tlnp | grep :3002 || echo "❌ 端口3002未被占用"

# 3. 检查进程状态
echo -e "\n3. 检查进程状态:"
echo "Node.js 相关进程:"
ps aux | grep -E "(node|npm|netlify)" | grep -v grep || echo "❌ 没有找到Node.js进程"

# 4. 检查Nginx配置
echo -e "\n4. 检查Nginx配置:"
if [ -f "/etc/nginx/sites-available/nanobanana.gitagent.io" ]; then
    echo "✅ Nginx配置文件存在"
    echo "当前代理配置:"
    grep -A 3 -B 3 "proxy_pass" /etc/nginx/sites-available/nanobanana.gitagent.io
    
    # 检查是否有错误的端口配置
    if grep -q "localhost:8890" /etc/nginx/sites-available/nanobanana.gitagent.io; then
        echo "⚠️  发现错误的代理端口 8890"
    elif grep -q "localhost:8889" /etc/nginx/sites-available/nanobanana.gitagent.io; then
        echo "✅ 代理端口配置正确 (8889)"
    else
        echo "❓ 未找到代理端口配置"
    fi
else
    echo "❌ Nginx配置文件不存在"
fi

# 5. 检查项目文件
echo -e "\n5. 检查项目文件:"
echo "server.js 文件:"
if [ -f "server/server.js" ]; then
    echo "✅ server/server.js 存在"
else
    echo "❌ server/server.js 不存在"
fi

echo "package.json 文件:"
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
    echo "当前版本信息:"
    grep -A 3 -B 3 '"name"' package.json
else
    echo "❌ package.json 不存在"
fi

# 6. 检查环境变量
echo -e "\n6. 检查环境变量:"
if [ -f "server/.env" ]; then
    echo "✅ server/.env 存在"
    echo "环境变量配置 (隐藏敏感信息):"
    grep -E "^[A-Z_]+" server/.env | sed 's/=.*/=***/' || echo "无环境变量"
else
    echo "❌ server/.env 不存在"
fi

# 7. 检查日志文件
echo -e "\n7. 检查日志文件:"
if [ -f "server.log" ]; then
    echo "✅ server.log 存在，最后10行:"
    tail -10 server.log
else
    echo "❌ server.log 不存在"
fi

if [ -f "frontend.log" ]; then
    echo "✅ frontend.log 存在，最后5行:"
    tail -5 frontend.log
else
    echo "❌ frontend.log 不存在"
fi

# 8. 网络连通性测试
echo -e "\n8. 网络连通性测试:"
echo "本地回环测试:"
curl -s --connect-timeout 5 http://localhost:8889 > /dev/null && echo "✅ localhost:8889 可访问" || echo "❌ localhost:8889 不可访问"
curl -s --connect-timeout 5 http://localhost:3002/health > /dev/null && echo "✅ localhost:3002 可访问" || echo "❌ localhost:3002 不可访问"

echo -e "\n=== 诊断完成 ==="
echo "请根据上述信息进行相应的修复操作"
