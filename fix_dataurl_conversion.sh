#!/bin/bash

echo "🔧 修复dataURL转换问题..."
echo "=================================="

SERVER="54.89.140.250"
KEY_PATH="/Users/a1/work/productmindai.pem"
PROJECT_DIR="/home/ec2-user/nanobanana"

echo "📋 问题分析："
echo "- 后端返回图片URL而不是data URL ✅"
echo "- convertApiResultToDataUrl函数需要将URL转换为真正的data URL ❌"
echo "- dataURLtoFile函数期望data URL格式 ✅"
echo ""

echo "🔧 修复步骤："
echo "=================================="

echo "1️⃣ 部署修复到服务器..."
rsync -avz -e "ssh -i $KEY_PATH" \
  services/hybridImageService.ts \
  ec2-user@$SERVER:$PROJECT_DIR/services/

echo "✅ 文件已上传到服务器"

echo ""
echo "2️⃣ 重启前端服务以应用修复..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '🔄 停止前端服务...'
pkill -f 'npm run dev' 2>/dev/null || echo '前端服务未运行'
pkill -f 'vite' 2>/dev/null || echo 'Vite服务未运行'
sleep 3

echo '🚀 启动前端服务...'
nohup npm run dev > frontend.log 2>&1 &
sleep 8

echo '🔍 检查服务状态:'
ps aux | grep -E 'npm.*dev|vite' | grep -v grep || echo '❌ 前端服务启动失败'

echo ''
echo '🔍 检查端口状态:'
netstat -tlnp | grep -E ':(8889|8890)' || echo '❌ 前端端口未监听'
"

echo ""
echo "3️⃣ 验证修复..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '🧪 测试服务状态:'
curl -s http://localhost:3002/health | head -50
echo ''
curl -s -I http://localhost:8889 | head -3
"

echo ""
echo "✅ 修复完成！"
echo ""
echo "📋 验证步骤："
echo "1. 打开浏览器访问: https://nanobanana.gitagent.io"
echo "2. 打开开发者工具控制台"
echo "3. 测试图片调整功能"
echo "4. 查看控制台日志，应该看到:"
echo "   - '🔄 [ImageConvert] 开始转换图片URL为data URL'"
echo "   - '✅ [ImageConvert] 图片转换成功'"
echo "5. 确认不再出现 'Invalid data URL' 错误"
