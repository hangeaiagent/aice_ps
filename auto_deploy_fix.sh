#!/bin/bash

# 🚀 自动化部署和修复脚本
# 解决NanoBanana 500错误和Spot 502错误

echo "=== 开始自动化部署和修复 ==="
echo "时间: $(date)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 第一步：检查当前状态
log_info "检查当前服务状态..."
echo "当前端口占用情况:"
netstat -tlnp | grep -E ':(3001|3002|5173|8889)' || echo "没有发现目标端口占用"

echo "当前运行的Node进程:"
ps aux | grep -E '(node|npm|vite|netlify)' | grep -v grep || echo "没有发现相关进程"

# 第二步：停止所有服务
log_info "停止所有可能冲突的服务..."
pkill -f "node.*server" 2>/dev/null && log_info "已停止node server进程" || log_warn "没有找到node server进程"
pkill -f "vite" 2>/dev/null && log_info "已停止vite进程" || log_warn "没有找到vite进程"
pkill -f "netlify" 2>/dev/null && log_info "已停止netlify进程" || log_warn "没有找到netlify进程"
pkill -f "npm.*dev" 2>/dev/null && log_info "已停止npm dev进程" || log_warn "没有找到npm dev进程"

log_info "等待进程完全停止..."
sleep 5

# 第三步：进入项目目录
log_info "进入NanoBanana项目目录..."
cd /home/ec2-user/nanobanana || {
    log_error "无法进入项目目录 /home/ec2-user/nanobanana"
    exit 1
}

# 第四步：拉取最新代码
log_info "拉取最新代码..."
git pull origin main || {
    log_error "拉取代码失败"
    exit 1
}

# 第五步：启动NanoBanana后端服务
log_info "启动NanoBanana后端服务 (端口3002)..."
cd server
nohup node server.js > ../nanobanana_server.log 2>&1 &
NANOBANANA_BACKEND_PID=$!
cd ..

log_info "等待后端服务启动..."
sleep 5

# 验证后端服务
log_info "验证NanoBanana后端服务..."
if curl -s localhost:3002/health | grep -q "ok"; then
    log_info "✅ NanoBanana后端服务启动成功"
else
    log_error "❌ NanoBanana后端服务启动失败"
    echo "后端日志:"
    tail -10 nanobanana_server.log
    exit 1
fi

# 测试AI图片定制API
if curl -s localhost:3002/api/custom-image-generation/health | grep -q "ok"; then
    log_info "✅ AI图片定制API正常"
else
    log_error "❌ AI图片定制API异常"
fi

# 第六步：启动NanoBanana前端服务
log_info "启动NanoBanana前端服务 (端口8889)..."
nohup npx vite --port 8889 --host 0.0.0.0 > nanobanana_frontend.log 2>&1 &
NANOBANANA_FRONTEND_PID=$!

log_info "等待前端服务启动..."
sleep 15

# 验证前端服务
log_info "验证NanoBanana前端服务..."
if curl -s -I localhost:8889 | grep -q "200\|301\|302"; then
    log_info "✅ NanoBanana前端服务启动成功"
else
    log_warn "⚠️ NanoBanana前端服务可能需要更多时间启动"
    echo "前端日志:"
    tail -10 nanobanana_frontend.log
fi

# 第七步：检查Spot项目（如果存在）
log_info "检查Spot项目..."
if [ -d "/home/ec2-user/spot" ]; then
    log_info "发现Spot项目，开始启动..."
    
    cd /home/ec2-user/spot
    
    # 启动Spot后端 (端口3001)
    if [ -f "server/server.js" ]; then
        log_info "启动Spot后端服务 (端口3001)..."
        cd server
        nohup node server.js > ../spot_server.log 2>&1 &
        SPOT_BACKEND_PID=$!
        cd ..
        sleep 5
        
        if curl -s localhost:3001/health | grep -q "ok"; then
            log_info "✅ Spot后端服务启动成功"
        else
            log_warn "⚠️ Spot后端服务启动可能有问题"
        fi
    fi
    
    # 启动Spot前端 (端口5173)
    if [ -f "package.json" ]; then
        log_info "启动Spot前端服务 (端口5173)..."
        nohup npx vite --port 5173 --host 0.0.0.0 > spot_frontend.log 2>&1 &
        SPOT_FRONTEND_PID=$!
        sleep 10
        
        if curl -s -I localhost:5173 | grep -q "200\|301\|302"; then
            log_info "✅ Spot前端服务启动成功"
        else
            log_warn "⚠️ Spot前端服务可能需要更多时间启动"
        fi
    fi
    
    cd /home/ec2-user/nanobanana
else
    log_warn "未找到Spot项目目录"
fi

# 第八步：检查Nginx配置
log_info "检查Nginx配置..."
if sudo nginx -t 2>/dev/null; then
    log_info "✅ Nginx配置语法正确"
    
    # 重新加载Nginx
    if sudo systemctl reload nginx 2>/dev/null; then
        log_info "✅ Nginx配置已重新加载"
    else
        log_warn "⚠️ Nginx重新加载失败，可能需要手动处理"
    fi
else
    log_error "❌ Nginx配置有语法错误"
    sudo nginx -t
fi

# 第九步：最终验证
log_info "进行最终验证..."

echo ""
echo "=== 服务状态总结 ==="

# 检查端口占用
echo "端口占用情况:"
netstat -tlnp | grep -E ':(3001|3002|5173|8889)' || echo "没有发现目标端口占用"

echo ""
echo "=== API测试结果 ==="

# 测试NanoBanana
echo "NanoBanana后端健康检查:"
curl -s localhost:3002/health || echo "连接失败"

echo ""
echo "NanoBanana AI图片定制API:"
curl -s localhost:3002/api/custom-image-generation/health || echo "连接失败"

echo ""
echo "NanoBanana前端服务:"
curl -s -I localhost:8889 | head -1 || echo "连接失败"

# 测试Spot (如果存在)
if [ -d "/home/ec2-user/spot" ]; then
    echo ""
    echo "Spot后端健康检查:"
    curl -s localhost:3001/health || echo "连接失败"
    
    echo ""
    echo "Spot前端服务:"
    curl -s -I localhost:5173 | head -1 || echo "连接失败"
fi

echo ""
echo "=== 外部访问测试 ==="
echo "NanoBanana生产环境:"
curl -s -I https://nanobanana.gitagent.io | head -1 || echo "连接失败"

echo ""
echo "Spot生产环境:"
curl -s -I https://spot.gitagent.io | head -1 || echo "连接失败"

echo ""
echo "=== 部署完成 ==="
echo "时间: $(date)"

# 保存进程ID到文件
echo "NanoBanana Backend PID: $NANOBANANA_BACKEND_PID" > deployment_pids.txt
echo "NanoBanana Frontend PID: $NANOBANANA_FRONTEND_PID" >> deployment_pids.txt
[ ! -z "$SPOT_BACKEND_PID" ] && echo "Spot Backend PID: $SPOT_BACKEND_PID" >> deployment_pids.txt
[ ! -z "$SPOT_FRONTEND_PID" ] && echo "Spot Frontend PID: $SPOT_FRONTEND_PID" >> deployment_pids.txt

log_info "进程ID已保存到 deployment_pids.txt"
log_info "如需停止服务，可以使用: kill \$(cat deployment_pids.txt | awk '{print \$NF}')"

echo ""
echo "🎉 部署脚本执行完成！"
echo "请检查上述测试结果，确认所有服务都正常运行。"
