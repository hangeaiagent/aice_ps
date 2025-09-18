/**
 * 测试API端点配置
 * 验证前端是否正确连接到后端API
 */

console.log('🧪 测试API端点配置...');

// 在浏览器控制台中执行的测试代码
const testCode = `
// 1. 检查环境变量
console.log('🔧 环境变量检查:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_USE_SERVER_GENERATION:', import.meta.env.VITE_USE_SERVER_GENERATION);

// 2. 检查API服务配置
console.log('🌐 API服务配置:');
if (typeof apiService !== 'undefined') {
  console.log('apiService可用:', true);
  console.log('服务器生成启用:', apiService.isServerGenerationEnabled());
} else {
  console.log('apiService不可用');
}

// 3. 测试健康检查端点
console.log('💓 测试健康检查...');
try {
  const healthResponse = await fetch('/health');
  console.log('健康检查状态:', healthResponse.status);
  const healthData = await healthResponse.text();
  console.log('健康检查响应:', healthData);
} catch (error) {
  console.error('健康检查失败:', error);
}

// 4. 测试API端点
console.log('🔌 测试API端点...');
try {
  const apiResponse = await fetch('/api/templates?limit=1');
  console.log('API端点状态:', apiResponse.status);
  if (apiResponse.ok) {
    const apiData = await apiResponse.json();
    console.log('API响应成功:', apiData.success);
  }
} catch (error) {
  console.error('API端点测试失败:', error);
}

// 5. 检查用户登录状态
console.log('👤 检查用户状态...');
try {
  const userResult = await supabase.auth.getUser();
  console.log('用户登录状态:', userResult.data.user ? '已登录' : '未登录');
  if (userResult.data.user) {
    console.log('用户ID:', userResult.data.user.id);
  }
} catch (error) {
  console.error('用户状态检查失败:', error);
}

// 6. 测试任务记录服务
console.log('📋 测试任务记录服务...');
if (typeof taskHistoryService !== 'undefined') {
  console.log('taskHistoryService可用:', true);
  try {
    // 只有在用户登录时才测试
    const userResult = await supabase.auth.getUser();
    if (userResult.data.user) {
      const tasks = await taskHistoryService.getTasks({ limit: 1 });
      console.log('任务记录获取成功:', tasks.data.pagination.total_items, '条记录');
    } else {
      console.log('用户未登录，跳过任务记录测试');
    }
  } catch (error) {
    console.error('任务记录服务测试失败:', error);
  }
} else {
  console.log('taskHistoryService不可用');
}

console.log('✅ API端点测试完成');
`;

console.log(`
📋 请在浏览器中执行以下步骤:

1. 访问 https://nanobanana.gitagent.io
2. 打开浏览器开发者工具 (F12)
3. 切换到 Console 标签
4. 粘贴并执行以下代码:

${testCode}

这将帮助我们诊断:
- 环境变量是否正确加载
- API端点是否可访问
- 用户登录状态
- 任务记录服务是否工作

执行完成后，请将控制台输出结果告诉我。
`);
