#!/bin/bash

# 🚀 服务器执行脚本 - 一键解决NanoBanana 500错误和Spot 502错误
# 请将此脚本内容复制到服务器上执行

echo "=== 开始服务器部署修复 ==="
echo "时间: $(date)"

# 第一步：检查当前状态
echo "1. 检查当前服务状态..."
echo "当前端口占用:"
netstat -tlnp | grep -E ':(3001|3002|5173|8889)' || echo "没有发现目标端口占用"

echo "当前Node进程:"
ps aux | grep -E '(node|npm|vite|netlify)' | grep -v grep || echo "没有发现相关进程"

# 第二步：停止所有冲突服务
echo "2. 停止所有可能冲突的服务..."
pkill -f "node.*server" 2>/dev/null && echo "✅ 已停止node server进程"
pkill -f "vite" 2>/dev/null && echo "✅ 已停止vite进程"
pkill -f "netlify" 2>/dev/null && echo "✅ 已停止netlify进程"
pkill -f "npm.*dev" 2>/dev/null && echo "✅ 已停止npm dev进程"

echo "等待进程完全停止..."
sleep 5

# 第三步：进入NanoBanana项目并拉取代码
echo "3. 更新NanoBanana项目..."
cd /home/ec2-user/nanobanana || {
    echo "❌ 无法进入项目目录 /home/ec2-user/nanobanana"
    exit 1
}

git pull origin main || {
    echo "❌ 拉取代码失败"
    exit 1
}

# 第四步：启动NanoBanana后端服务 (端口3002)
echo "4. 启动NanoBanana后端服务..."
cd server
nohup node server.js > ../nanobanana_server.log 2>&1 &
NANO_BACKEND_PID=$!
echo "NanoBanana后端PID: $NANO_BACKEND_PID"
cd ..

sleep 5

# 验证NanoBanana后端
echo "验证NanoBanana后端服务..."
if curl -s localhost:3002/health | grep -q "ok"; then
    echo "✅ NanoBanana后端启动成功"
    
    # 测试AI图片定制API
    if curl -s localhost:3002/api/custom-image-generation/health | grep -q "ok"; then
        echo "✅ AI图片定制API正常"
    else
        echo "⚠️ AI图片定制API可能有问题"
    fi
else
    echo "❌ NanoBanana后端启动失败"
    echo "后端日志:"
    tail -10 nanobanana_server.log
fi

# 第五步：启动NanoBanana前端服务 (端口8889)
echo "5. 启动NanoBanana前端服务..."
nohup npx vite --port 8889 --host 0.0.0.0 > nanobanana_frontend.log 2>&1 &
NANO_FRONTEND_PID=$!
echo "NanoBanana前端PID: $NANO_FRONTEND_PID"

echo "等待前端服务启动..."
sleep 15

# 验证NanoBanana前端
echo "验证NanoBanana前端服务..."
if curl -s -I localhost:8889 | grep -q "200\|301\|302"; then
    echo "✅ NanoBanana前端启动成功"
else
    echo "⚠️ NanoBanana前端可能需要更多时间启动"
    echo "前端日志:"
    tail -5 nanobanana_frontend.log
fi

# 第六步：处理Spot项目（如果存在）
echo "6. 检查并启动Spot项目..."
if [ -d "/home/ec2-user/spot" ]; then
    echo "发现Spot项目，开始启动..."
    cd /home/ec2-user/spot
    
    # 拉取Spot最新代码
    git pull origin main 2>/dev/null || echo "Spot项目拉取代码跳过"
    
    # 启动Spot后端 (端口3001)
    if [ -f "server/server.js" ]; then
        echo "启动Spot后端服务 (端口3001)..."
        cd server
        nohup node server.js > ../spot_server.log 2>&1 &
        SPOT_BACKEND_PID=$!
        echo "Spot后端PID: $SPOT_BACKEND_PID"
        cd ..
        sleep 5
        
        if curl -s localhost:3001/health | grep -q "ok"; then
            echo "✅ Spot后端启动成功"
        else
            echo "⚠️ Spot后端启动可能有问题"
            echo "Spot后端日志:"
            tail -5 spot_server.log
        fi
    else
        echo "⚠️ 未找到Spot后端服务文件"
    fi
    
    # 启动Spot前端 (端口5173)
    if [ -f "package.json" ]; then
        echo "启动Spot前端服务 (端口5173)..."
        nohup npx vite --port 5173 --host 0.0.0.0 > spot_frontend.log 2>&1 &
        SPOT_FRONTEND_PID=$!
        echo "Spot前端PID: $SPOT_FRONTEND_PID"
        sleep 10
        
        if curl -s -I localhost:5173 | grep -q "200\|301\|302"; then
            echo "✅ Spot前端启动成功"
        else
            echo "⚠️ Spot前端可能需要更多时间启动"
            echo "Spot前端日志:"
            tail -5 spot_frontend.log
        fi
    else
        echo "⚠️ 未找到Spot前端配置文件"
    fi
    
    cd /home/ec2-user/nanobanana
else
    echo "⚠️ 未找到Spot项目目录，跳过Spot服务启动"
fi

# 第七步：检查和重新加载Nginx
echo "7. 检查Nginx配置..."
if sudo nginx -t 2>/dev/null; then
    echo "✅ Nginx配置语法正确"
    if sudo systemctl reload nginx 2>/dev/null; then
        echo "✅ Nginx配置已重新加载"
    else
        echo "⚠️ Nginx重新加载失败"
    fi
else
    echo "❌ Nginx配置有语法错误"
    sudo nginx -t
fi

# 第八步：最终验证
echo "8. 最终验证结果..."
echo ""
echo "=== 端口占用情况 ==="
netstat -tlnp | grep -E ':(3001|3002|5173|8889)' || echo "没有发现目标端口占用"

echo ""
echo "=== 服务测试结果 ==="

echo "NanoBanana后端健康检查:"
curl -s localhost:3002/health 2>/dev/null || echo "连接失败"

echo ""
echo "NanoBanana AI图片定制API:"
curl -s localhost:3002/api/custom-image-generation/health 2>/dev/null || echo "连接失败"

echo ""
echo "NanoBanana前端服务:"
curl -s -I localhost:8889 2>/dev/null | head -1 || echo "连接失败"

if [ -d "/home/ec2-user/spot" ]; then
    echo ""
    echo "Spot后端健康检查:"
    curl -s localhost:3001/health 2>/dev/null || echo "连接失败"
    
    echo ""
    echo "Spot前端服务:"
    curl -s -I localhost:5173 2>/dev/null | head -1 || echo "连接失败"
fi

echo ""
echo "=== 生产环境测试 ==="
echo "NanoBanana生产环境:"
curl -s -I https://nanobanana.gitagent.io 2>/dev/null | head -1 || echo "连接失败"

echo ""
echo "Spot生产环境:"
curl -s -I https://spot.gitagent.io 2>/dev/null | head -1 || echo "连接失败"

# 保存进程ID
echo ""
echo "=== 进程ID记录 ==="
echo "NanoBanana Backend PID: $NANO_BACKEND_PID" | tee deployment_pids.txt
echo "NanoBanana Frontend PID: $NANO_FRONTEND_PID" | tee -a deployment_pids.txt
[ ! -z "$SPOT_BACKEND_PID" ] && echo "Spot Backend PID: $SPOT_BACKEND_PID" | tee -a deployment_pids.txt
[ ! -z "$SPOT_FRONTEND_PID" ] && echo "Spot Frontend PID: $SPOT_FRONTEND_PID" | tee -a deployment_pids.txt

echo ""
echo "🎉 部署完成！"
echo "时间: $(date)"
echo ""
echo "📋 检查结果:"
echo "- 如果看到 ✅ 表示该服务启动成功"
echo "- 如果看到 ⚠️ 表示可能需要等待或检查"
echo "- 如果看到 ❌ 表示有错误需要处理"
echo ""
echo "📝 日志文件位置:"
echo "- NanoBanana后端: /home/ec2-user/nanobanana/nanobanana_server.log"
echo "- NanoBanana前端: /home/ec2-user/nanobanana/nanobanana_frontend.log"
echo "- Spot后端: /home/ec2-user/spot/spot_server.log"
echo "- Spot前端: /home/ec2-user/spot/spot_frontend.log"
echo ""
echo "🔧 如需停止服务:"
echo "kill \$(cat /home/ec2-user/nanobanana/deployment_pids.txt | awk '{print \$NF}')"
