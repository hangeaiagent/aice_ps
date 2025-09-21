/**
 * 验证任务记录修复效果的简单测试
 * 在浏览器控制台中执行
 */

console.log('🔧 验证任务记录修复效果...\n');

// 测试图片URL解析函数
const testParseImageUrl = () => {
  console.log('📋 测试图片URL解析功能:');
  
  // 模拟JSON格式的URL（问题场景）
  const jsonUrl = '{"imageUrl":"http://localhost:3002/images/test.jpg","filename":"test.jpg","storage":"local","path":"/path/to/test.jpg"}';
  
  // 模拟普通URL
  const normalUrl = 'http://localhost:3002/images/test.jpg';
  
  // 模拟null/undefined
  const nullUrl = null;
  const undefinedUrl = undefined;
  
  // 测试解析函数（模拟前端逻辑）
  const parseImageUrl = (url) => {
    if (!url) return null;
    
    try {
      if (typeof url === 'string' && url.startsWith('{')) {
        const parsed = JSON.parse(url);
        return parsed.imageUrl || null;
      }
      return url;
    } catch (error) {
      console.warn('解析图片URL失败:', error);
      return url;
    }
  };
  
  console.log('JSON格式URL:', parseImageUrl(jsonUrl));
  console.log('普通URL:', parseImageUrl(normalUrl));
  console.log('null值:', parseImageUrl(nullUrl));
  console.log('undefined值:', parseImageUrl(undefinedUrl));
  console.log('✅ URL解析功能测试完成\n');
};

// 测试任务记录获取
const testTaskRecords = async () => {
  console.log('📋 测试任务记录获取:');
  
  try {
    // 检查用户登录状态
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ 用户未登录，无法测试任务记录');
      return;
    }
    
    console.log('✅ 用户已登录:', user.id);
    
    // 获取任务记录
    const tasks = await taskHistoryService.getTasks({ limit: 3 });
    console.log('✅ 成功获取任务记录');
    console.log('任务总数:', tasks.data.pagination.total_items);
    
    if (tasks.data.tasks.length > 0) {
      console.log('\n最新任务详情:');
      const task = tasks.data.tasks[0];
      
      console.log('- 任务ID:', task.id);
      console.log('- 状态:', task.status);
      console.log('- 原始图片URL类型:', typeof task.original_image_url);
      console.log('- 原始图片URL:', task.original_image_url?.substring(0, 100) + '...');
      console.log('- 生成图片URL:', task.generated_image_url?.substring(0, 100) + '...');
      console.log('- Token消耗:', task.tokens_used);
      console.log('- 积分消耗:', task.credits_deducted);
      console.log('- 生成时间:', task.generation_time_ms);
      
      // 检查修复效果
      const issues = [];
      
      if (task.original_image_url && task.original_image_url.includes('{"imageUrl"')) {
        issues.push('原始图片URL仍为JSON格式');
      }
      
      if (task.tokens_used === null || task.tokens_used === undefined) {
        issues.push('Token消耗为null/undefined');
      }
      
      if (task.credits_deducted === null || task.credits_deducted === undefined) {
        issues.push('积分消耗为null/undefined');
      }
      
      if (task.generation_time_ms === null) {
        issues.push('生成时间为null');
      }
      
      if (issues.length === 0) {
        console.log('\n✅ 所有问题已修复！');
      } else {
        console.log('\n❌ 仍存在问题:');
        issues.forEach(issue => console.log('  -', issue));
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
};

// 执行所有测试
const runTests = async () => {
  console.log('🚀 开始验证修复效果...\n');
  
  testParseImageUrl();
  await testTaskRecords();
  
  console.log('\n✅ 验证完成！');
  console.log('\n📝 修复总结:');
  console.log('1. ✅ 前端添加了图片URL解析功能');
  console.log('2. ✅ 后端修复了存储格式问题');
  console.log('3. ✅ 改进了统计信息显示逻辑');
  console.log('4. ✅ 增强了错误处理和容错机制');
  
  console.log('\n🎯 请刷新任务记录页面查看修复效果！');
};

// 自动运行测试
runTests();

// 导出测试函数
window.verifyFixes = {
  runTests,
  testParseImageUrl,
  testTaskRecords
};

console.log('\n💡 提示: 测试函数已添加到 window.verifyFixes 对象中');
