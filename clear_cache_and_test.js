/**
 * 清除权限缓存并测试功能
 * 在浏览器控制台中执行此代码
 */

console.log('🔄 开始清除缓存并测试权限...');

// 步骤1: 清除权限缓存
console.log('\n📋 步骤1: 清除权限缓存');
try {
  // 清除本地权限缓存
  if (typeof permissionService !== 'undefined') {
    permissionService.clearPermissionsCache();
    console.log('✅ 本地权限缓存已清除');
  } else {
    console.log('⚠️ permissionService 不可用');
  }
} catch (error) {
  console.error('清除缓存失败:', error);
}

// 步骤2: 获取当前用户
console.log('\n📋 步骤2: 检查用户登录状态');
const userResult = await supabase.auth.getUser();
if (!userResult.data.user) {
  console.error('❌ 用户未登录！请先登录');
  throw new Error('用户未登录');
}
const user = userResult.data.user;
console.log('✅ 用户已登录:', user.id);

// 步骤3: 刷新权限信息
console.log('\n📋 步骤3: 刷新权限信息');
try {
  await permissionService.refreshUserPermissions(user.id);
  console.log('✅ 权限信息已刷新');
} catch (error) {
  console.error('刷新权限失败:', error);
}

// 步骤4: 获取最新权限
console.log('\n📋 步骤4: 获取最新权限信息');
try {
  const permissions = await permissionService.getUserPermissions(user);
  console.log('✅ 权限信息获取成功:');
  console.log('  - 计划名称:', permissions.plan_name);
  console.log('  - nano_banana功能:', permissions.features.nano_banana ? '✅ 可用' : '❌ 不可用');
  console.log('  - 可用积分:', permissions.credits.available_credits);
  console.log('  - 月度配额:', permissions.limits.credits_monthly);
  console.log('  - 完整权限:', permissions);
} catch (error) {
  console.error('获取权限失败:', error);
}

// 步骤5: 直接调用API验证
console.log('\n📋 步骤5: 直接调用API验证权限');
try {
  const response = await fetch(`/api/user-permissions/${user.id}`);
  const result = await response.json();
  console.log('✅ API响应:', result);
  console.log('  - nano_banana功能(API):', result.data.permissions.features.nano_banana ? '✅ 可用' : '❌ 不可用');
  console.log('  - 可用积分(API):', result.data.permissions.creditsRemaining);
} catch (error) {
  console.error('API调用失败:', error);
}

// 步骤6: 测试权限检查
console.log('\n📋 步骤6: 测试权限检查');
try {
  const checkResult = await permissionService.checkFeaturePermission(user, 'nano_banana');
  console.log('✅ 权限检查结果:', checkResult);
  if (checkResult.allowed) {
    console.log('  ✅ nano_banana功能权限检查通过！');
  } else {
    console.log('  ❌ nano_banana功能权限检查失败:', checkResult.message);
  }
} catch (error) {
  console.error('权限检查失败:', error);
}

// 步骤7: 测试积分消费
console.log('\n📋 步骤7: 测试积分消费（模拟）');
try {
  const consumeResult = await permissionService.consumeCredits(user, 'nano_banana');
  console.log('✅ 积分消费测试结果:', consumeResult);
  if (consumeResult.success) {
    console.log('  ✅ 积分消费成功！');
    console.log('  - 消费积分:', consumeResult.creditsConsumed);
    console.log('  - 剩余积分:', consumeResult.remainingCredits);
  } else {
    console.log('  ❌ 积分消费失败:', consumeResult.message);
  }
} catch (error) {
  console.error('积分消费测试失败:', error);
}

console.log('\n✅ 测试完成！');
console.log('📌 如果权限仍然显示不可用，请尝试:');
console.log('  1. 完全刷新页面 (Ctrl+F5 或 Cmd+Shift+R)');
console.log('  2. 清除浏览器缓存');
console.log('  3. 重新登录账户');
console.log('  4. 等待5分钟后重试（权限缓存TTL）');
