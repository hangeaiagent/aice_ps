#!/bin/bash

echo "=== 服务器诊断和修复脚本 ==="
echo "时间: $(date)"
echo ""

# 1. 检查当前项目状态
echo "1. 检查项目状态..."
cd /home/ec2-user/nanobanana
./unified_three_projects_manager.sh status
echo ""

# 2. 检查端口占用
echo "2. 检查端口占用情况..."
netstat -tlnp | grep -E ":(3000|3001|3002|8000|8001|8889|9527|3003)"
echo ""

# 3. 检查进程
echo "3. 检查相关进程..."
ps aux | grep -E "(node|npm|python)" | grep -v grep
echo ""

# 4. 停止所有服务
echo "4. 停止所有服务..."
./unified_three_projects_manager.sh stop
sleep 5
echo ""

# 5. 清理可能的僵尸进程
echo "5. 清理僵尸进程..."
pkill -f "node.*server"
pkill -f "npm.*dev"
pkill -f "vite"
sleep 3
echo ""

# 6. 重新启动服务
echo "6. 重新启动所有服务..."
./unified_three_projects_manager.sh start
sleep 10
echo ""

# 7. 检查启动后状态
echo "7. 检查启动后状态..."
./unified_three_projects_manager.sh status
echo ""

# 8. 检查端口是否正常监听
echo "8. 检查端口监听状态..."
netstat -tlnp | grep -E ":(3000|3001|3002|8000|8001|8889|9527|3003)"
echo ""

# 9. 测试本地连接
echo "9. 测试本地API连接..."
curl -s -o /dev/null -w "NanoBanana后端(3002): %{http_code}\n" http://localhost:3002/health || echo "NanoBanana后端(3002): 连接失败"
curl -s -o /dev/null -w "Admin后端(8000): %{http_code}\n" http://localhost:8000/health || echo "Admin后端(8000): 连接失败"
curl -s -o /dev/null -w "OrientDirector后端(8001): %{http_code}\n" http://localhost:8001/health || echo "OrientDirector后端(8001): 连接失败"
echo ""

# 10. 检查Nginx状态
echo "10. 检查Nginx状态..."
sudo systemctl status nginx --no-pager -l
echo ""

# 11. 检查Nginx错误日志
echo "11. 最近的Nginx错误日志..."
sudo tail -20 /var/log/nginx/error.log
echo ""

# 12. 重启Nginx（如果需要）
echo "12. 重启Nginx..."
sudo systemctl restart nginx
sleep 3
sudo systemctl status nginx --no-pager -l
echo ""

echo "=== 诊断完成 ==="
echo "请检查上述输出，如果所有服务都正常启动，现在可以测试网站访问。"

