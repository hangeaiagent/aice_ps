#!/bin/bash

echo "🔧 统一使用根目录.env配置..."
echo "=================================="

SERVER="54.89.140.250"
KEY_PATH="/Users/a1/work/productmindai.pem"
PROJECT_DIR="/home/ec2-user/nanobanana"

echo "📋 问题分析："
echo "- 根目录.env: STORAGE_TYPE=aws ✅ 正确配置"
echo "- server/.env: STORAGE_TYPE=local ❌ 错误配置"
echo "- 需要统一使用根目录.env配置"
echo ""

echo "🔧 修复步骤："
echo "=================================="

echo "1️⃣ 检查当前配置差异..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '📄 根目录.env AWS配置:'
grep -E '^(STORAGE_TYPE|AWS_)' .env

echo ''
echo '📄 server/.env AWS配置:'
if [ -f server/.env ]; then
    grep -E '^(STORAGE_TYPE|AWS_)' server/.env
else
    echo 'server/.env文件不存在'
fi
"

echo ""
echo "2️⃣ 删除server/.env文件，统一使用根目录配置..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

if [ -f server/.env ]; then
    echo '🗑️ 备份并删除server/.env文件...'
    cp server/.env server/.env.backup
    rm server/.env
    echo '✅ server/.env已删除，将使用根目录.env配置'
else
    echo '✅ server/.env文件不存在，已使用根目录配置'
fi
"

echo ""
echo "3️⃣ 验证Node.js进程能否访问根目录.env..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '🔍 测试环境变量读取:'
node -e \"
require('dotenv').config();
console.log('STORAGE_TYPE:', process.env.STORAGE_TYPE);
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '已设置' : '未设置');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '已设置' : '未设置');
\"
"

echo ""
echo "4️⃣ 重启后端服务以应用新配置..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '🔄 停止后端服务...'
pkill -f 'node server.js' 2>/dev/null || echo '后端服务未运行'
sleep 3

echo '🚀 启动后端服务...'
cd server
nohup node server.js > ../server.log 2>&1 &
sleep 5

echo '🔍 检查服务状态:'
ps aux | grep 'node server' | grep -v grep || echo '❌ 后端服务启动失败'

echo ''
echo '🔍 检查端口3002:'
netstat -tlnp | grep :3002 || echo '❌ 端口3002未监听'
"

echo ""
echo "5️⃣ 测试AWS存储配置..."
ssh -i "$KEY_PATH" ec2-user@"$SERVER" "
cd $PROJECT_DIR

echo '🧪 测试后端服务健康状态:'
curl -s http://localhost:3002/health | head -100

echo ''
echo '📋 检查最新的服务器日志:'
tail -10 server.log | grep -E '(启动|AWS|存储|配置)' || echo '未发现相关日志'
"

echo ""
echo "✅ 配置统一完成！"
echo ""
echo "📋 验证步骤："
echo "1. 后端服务现在使用根目录.env配置"
echo "2. STORAGE_TYPE=aws，图片将上传到AWS S3"
echo "3. 测试图片编辑功能，观察日志中的AWS上传信息"
echo "4. 检查生成的图片URL是否为S3地址"
