-- 修复支付表的RLS策略
-- 解决406错误：确保用户可以访问自己的订阅和积分数据

-- =================================
-- 1. 检查并启用RLS
-- =================================
ALTER TABLE public.pay_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_credits ENABLE ROW LEVEL SECURITY;

-- =================================
-- 2. 删除可能冲突的旧策略
-- =================================
DROP POLICY IF EXISTS "pay_subscription_plans_select" ON public.pay_subscription_plans;
DROP POLICY IF EXISTS "pay_user_subscriptions_select" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_subscriptions_insert" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_subscriptions_update" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_credits_select" ON public.pay_user_credits;
DROP POLICY IF EXISTS "pay_user_credits_insert" ON public.pay_user_credits;
DROP POLICY IF EXISTS "pay_user_credits_update" ON public.pay_user_credits;

-- =================================
-- 3. 创建新的RLS策略
-- =================================

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

-- =================================
-- 4. 为当前用户创建默认积分记录（如果不存在）
-- =================================
-- 注意：这个函数需要在Supabase Dashboard中手动执行或通过API调用

-- 创建函数来初始化用户积分
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：当新用户注册时自动创建积分记录
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- =================================
-- 5. 检查表结构和数据
-- =================================
-- 确保套餐数据存在
INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features, is_active) VALUES
('free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": false, "templates": "basic", "editing_tools": "basic"}', true),
('starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple"}', true),
('advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "normal"}', true),
('professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "high"}', true),
('lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "highest", "dedicated_manager": true}', true)
ON CONFLICT (plan_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  plan_name_en = EXCLUDED.plan_name_en,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  credits_monthly = EXCLUDED.credits_monthly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
