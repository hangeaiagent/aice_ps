/**
 * 完整的任务记录工作流程测试
 * 在浏览器控制台中执行此代码
 */

console.log('🚀 开始完整的任务记录工作流程测试...\n');

// 步骤1: 清除缓存
console.log('📋 步骤1: 清除权限缓存');
if (typeof permissionService !== 'undefined') {
  permissionService.clearPermissionsCache();
  console.log('✅ 权限缓存已清除');
}

// 步骤2: 检查用户登录
console.log('\n📋 步骤2: 检查用户登录状态');
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.error('❌ 用户未登录！请先登录');
  throw new Error('用户未登录');
}
console.log('✅ 用户已登录:', user.id);

// 步骤3: 测试权限
console.log('\n📋 步骤3: 测试用户权限');
const permissions = await permissionService.getUserPermissions(user);
console.log('权限信息:');
console.log('  - nano_banana:', permissions.features.nano_banana ? '✅ 可用' : '❌ 不可用');
console.log('  - 可用积分:', permissions.credits.available_credits);

// 步骤4: 测试图片生成（简单测试）
console.log('\n📋 步骤4: 测试图片生成任务记录');
try {
  // 创建一个简单的测试
  console.log('开始测试图片生成...');
  
  // 直接调用任务记录服务
  const taskRecord = await taskHistoryService.createTask({
    task_type: 'image_generation',
    prompt: '测试任务记录功能',
    status: 'pending'
  });
  
  console.log('✅ 任务创建成功:', taskRecord);
  
  // 模拟完成任务
  const completedTask = await taskHistoryService.completeTask(taskRecord.id, {
    tokens_used: 10,
    credits_deducted: 1,
    generation_time_ms: 1000
  });
  
  console.log('✅ 任务完成成功:', completedTask);
  
} catch (error) {
  console.error('❌ 任务记录测试失败:', error);
}

// 步骤5: 查询任务历史
console.log('\n📋 步骤5: 查询任务历史');
try {
  const tasks = await taskHistoryService.getTasks({ limit: 5 });
  console.log('✅ 任务历史查询成功:');
  console.log('  - 总任务数:', tasks.data.pagination.total_items);
  console.log('  - 最新任务:', tasks.data.tasks[0]);
} catch (error) {
  console.error('❌ 查询任务历史失败:', error);
}

// 步骤6: 测试实际的图片调整功能
console.log('\n📋 步骤6: 准备测试实际图片调整功能');
console.log('请按以下步骤操作:');
console.log('1. 上传一张图片');
console.log('2. 选择调整功能（如亮度、对比度等）');
console.log('3. 点击应用');
console.log('4. 观察控制台中的 [TaskRecord] 日志');
console.log('');
console.log('预期看到的日志:');
console.log('  🔄 [TaskRecord] 开始图片调整流程...');
console.log('  👤 [TaskRecord] 用户状态: 已登录');
console.log('  🔐 [TaskRecord] 权限检查结果: { allowed: true }');
console.log('  📋 [TaskRecord] 任务记录创建成功');
console.log('  🎨 [TaskRecord] 图片调整完成');
console.log('  ✅ [TaskRecord] 任务记录完成成功');

console.log('\n✅ 测试准备完成！');
console.log('📌 如果看到权限错误，请确保:');
console.log('  1. 数据库函数 consume_user_credits 已创建');
console.log('  2. 用户有足够的积分（当前:', permissions.credits.available_credits, '）');
console.log('  3. nano_banana 功能已启用（当前:', permissions.features.nano_banana, '）');
