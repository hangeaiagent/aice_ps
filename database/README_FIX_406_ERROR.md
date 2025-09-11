# 修复406错误 - Supabase RLS策略问题

## 问题描述
用户访问价格页面和账户设置时出现406错误：
```
Failed to load resource: the server responded with a status of 406
```

## 原因分析
406错误表示Supabase的行级安全(RLS)策略阻止了API访问。虽然表存在，但缺少正确的RLS策略。

## 解决步骤

### 1. 登录Supabase Dashboard
访问：https://supabase.com/dashboard/project/[你的项目ID]

### 2. 执行SQL修复脚本
在 SQL Editor 中执行以下脚本：

```sql
-- 修复支付表的RLS策略
-- 解决406错误：确保用户可以访问自己的订阅和积分数据

-- 1. 检查并启用RLS
ALTER TABLE public.pay_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_credits ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能冲突的旧策略
DROP POLICY IF EXISTS "pay_subscription_plans_select" ON public.pay_subscription_plans;
DROP POLICY IF EXISTS "pay_user_subscriptions_select" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_subscriptions_insert" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_subscriptions_update" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_credits_select" ON public.pay_user_credits;
DROP POLICY IF EXISTS "pay_user_credits_insert" ON public.pay_user_credits;
DROP POLICY IF EXISTS "pay_user_credits_update" ON public.pay_user_credits;

-- 3. 创建新的RLS策略

-- 套餐表：所有认证用户可读（用于显示价格页面）
CREATE POLICY "pay_subscription_plans_read_policy" ON public.pay_subscription_plans
    FOR SELECT 
    TO authenticated
    USING (true);

-- 用户订阅表：用户只能访问自己的订阅
CREATE POLICY "pay_user_subscriptions_read_policy" ON public.pay_user_subscriptions
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "pay_user_subscriptions_insert_policy" ON public.pay_user_subscriptions
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pay_user_subscriptions_update_policy" ON public.pay_user_subscriptions
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 积分表：用户只能访问自己的积分
CREATE POLICY "pay_user_credits_read_policy" ON public.pay_user_credits
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "pay_user_credits_insert_policy" ON public.pay_user_credits
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pay_user_credits_update_policy" ON public.pay_user_credits
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. 创建函数来初始化用户积分
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pay_user_credits (
    user_id,
    total_credits,
    used_credits,
    available_credits,
    monthly_quota,
    quota_reset_date
  ) VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    NOW() + INTERVAL '1 month'
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建触发器：当新用户注册时自动创建积分记录
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();
```

### 3. 为现有用户创建积分记录
```sql
-- 为所有现有用户创建积分记录（如果不存在）
INSERT INTO public.pay_user_credits (
  user_id,
  total_credits,
  used_credits,
  available_credits,
  monthly_quota,
  quota_reset_date
)
SELECT 
  id,
  0,
  0,
  0,
  0,
  NOW() + INTERVAL '1 month'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.pay_user_credits);
```

### 4. 验证修复
执行以下查询验证RLS策略是否正确：

```sql
-- 检查RLS策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('pay_subscription_plans', 'pay_user_subscriptions', 'pay_user_credits');

-- 检查表数据
SELECT COUNT(*) as plan_count FROM public.pay_subscription_plans;
SELECT COUNT(*) as credits_count FROM public.pay_user_credits;
```

## 预期结果
- 价格页面可以正常显示套餐信息
- 用户可以访问账户设置和个人资料
- 套餐管理功能正常工作
- 不再出现406错误

## 注意事项
1. 确保在Supabase Dashboard的SQL Editor中执行，不是在本地
2. 执行前备份重要数据
3. 如果仍有问题，检查Supabase项目的API密钥配置
4. 确认.env文件中的SUPABASE_URL和SUPABASE_ANON_KEY正确
