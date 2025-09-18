/**
 * 测试任务记录功能
 * 模拟用户登录并生成图片，检查任务记录是否正常创建
 */

// 模拟浏览器环境中的测试
console.log('🧪 开始测试任务记录功能...');

// 测试步骤说明
console.log(`
📋 测试步骤:
1. 访问网站 https://nanobanana.gitagent.io
2. 用户登录
3. 生成一张图片
4. 检查任务记录是否创建
5. 访问任务记录页面验证数据

⚠️  注意: 这需要手动操作，因为涉及用户认证和图片生成
`);

// 提供测试用的调试代码
console.log(`
🔧 浏览器控制台调试代码:

// 1. 检查任务记录服务是否可用
console.log('taskHistoryService:', window.taskHistoryService || 'Not available');

// 2. 检查用户登录状态
console.log('User:', await supabase.auth.getUser());

// 3. 手动创建测试任务记录
try {
  const testTask = await taskHistoryService.recordImageGeneration(
    "测试提示词: 一只可爱的小猫",
    "image_generation",
    "1:1"
  );
  console.log('✅ 测试任务创建成功:', testTask.taskId);
  
  // 完成任务
  await testTask.completeTask({
    imageDataUrl: "data:image/png;base64,test",
    tokensUsed: 100,
    creditsDeducted: 1,
    generationTimeMs: 3000
  });
  console.log('✅ 测试任务完成');
} catch (error) {
  console.error('❌ 测试任务失败:', error);
}

// 4. 获取任务列表
try {
  const tasks = await taskHistoryService.getTasks({ limit: 5 });
  console.log('📋 任务列表:', tasks);
} catch (error) {
  console.error('❌ 获取任务列表失败:', error);
}
`);

console.log('✅ 测试脚本准备完成，请在浏览器中执行上述调试代码');
