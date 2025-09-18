#!/bin/bash

# 任务记录功能诊断脚本
# 检查任务记录功能各个环节是否正常

echo "🔍 任务记录功能诊断开始..."

SERVER_HOST="54.89.140.250"
SERVER_USER="ec2-user"
KEY_PATH="/Users/a1/work/productmindai.pem"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "📋 步骤1: 检查数据库表是否存在..." $YELLOW

# 这里需要手动在Supabase控制台检查
echo "请在Supabase控制台执行以下SQL来验证表是否存在："
echo "SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_task_history', 'user_task_statistics');"

print_message "📋 步骤2: 检查后端API路由..." $YELLOW

echo "测试任务记录API路由..."
curl -s -o /dev/null -w "任务记录API状态码: %{http_code}\n" "https://nanobanana.gitagent.io/api/task-history/tasks"

print_message "📋 步骤3: 检查前端服务文件..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "检查关键文件是否存在..."
echo "taskHistoryService.ts: $(ls -la services/taskHistoryService.ts 2>/dev/null | awk '{print $5" bytes"}' || echo "不存在")"
echo "hybridImageService.ts: $(ls -la services/hybridImageService.ts 2>/dev/null | awk '{print $5" bytes"}' || echo "不存在")"
echo "TaskHistoryPage.tsx: $(ls -la components/TaskHistoryPage.tsx 2>/dev/null | awk '{print $5" bytes"}' || echo "不存在")"

echo ""
echo "检查hybridImageService中的任务记录集成..."
grep -n "taskHistoryService\|recordImageGeneration" services/hybridImageService.ts | head -3

echo ""
echo "检查server.js中的任务记录路由..."
grep -n "task-history" server/server.js
EOF

print_message "📋 步骤4: 检查前端服务状态..." $YELLOW

ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /home/ec2-user/nanobanana

echo "检查前端服务进程..."
ps aux | grep -E "(netlify|vite)" | grep -v grep || echo "前端服务未运行"

echo ""
echo "检查前端日志最后几行..."
tail -5 frontend.log
EOF

print_message "📋 步骤5: 模拟任务记录创建..." $YELLOW

echo "创建测试脚本..."
cat > test_task_api.js << 'SCRIPT_EOF'
// 测试任务记录API的Node.js脚本
const https = require('https');

function testTaskAPI() {
  const options = {
    hostname: 'nanobanana.gitagent.io',
    port: 443,
    path: '/api/task-history/tasks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  };

  const postData = JSON.stringify({
    task_type: 'image_generation',
    prompt: '测试提示词',
    aspect_ratio: '1:1'
  });

  const req = https.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('响应:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`请求错误: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testTaskAPI();
SCRIPT_EOF

echo "运行API测试..."
node test_task_api.js

print_message "📋 步骤6: 检查用户认证流程..." $YELLOW

echo "检查用户认证相关的日志..."
ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "cd /home/ec2-user/nanobanana && grep -i 'auth\|login\|user' backend.log | tail -5"

print_message "📋 步骤7: 提供调试建议..." $BLUE

echo ""
echo "🔧 调试建议:"
echo "1. 确保用户已登录 - 检查浏览器控制台中的用户状态"
echo "2. 检查权限服务 - 确认用户有足够的积分"
echo "3. 查看浏览器网络面板 - 检查API调用是否成功"
echo "4. 检查控制台错误 - 查看是否有JavaScript错误"
echo ""
echo "🧪 浏览器测试代码:"
echo "// 在浏览器控制台中执行"
echo "console.log('用户状态:', await supabase.auth.getUser());"
echo "console.log('任务记录服务:', typeof taskHistoryService);"
echo ""
echo "// 手动测试图片生成"
echo "try {"
echo "  const result = await hybridImageService.generateImageFromText('测试图片', '1:1');"
echo "  console.log('生成成功:', result);"
echo "} catch (error) {"
echo "  console.error('生成失败:', error);"
echo "}"

# 清理测试文件
rm -f test_task_api.js

print_message "✅ 诊断完成！请根据上述结果进行问题排查。" $GREEN
