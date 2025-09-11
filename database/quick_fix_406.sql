-- 快速修复406错误 - 简化版RLS策略
-- 请在Supabase Dashboard的SQL Editor中执行此脚本

-- 1. 确保表存在并启用RLS
ALTER TABLE public.pay_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_credits ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "pay_subscription_plans_read_policy" ON public.pay_subscription_plans;
DROP POLICY IF EXISTS "pay_user_subscriptions_read_policy" ON public.pay_user_subscriptions;
DROP POLICY IF EXISTS "pay_user_credits_read_policy" ON public.pay_user_credits;

-- 3. 创建简单的读取策略

-- 套餐表：所有用户都可以读取（显示价格页面）
CREATE POLICY "allow_read_plans" ON public.pay_subscription_plans
    FOR SELECT TO public USING (true);

-- 用户订阅表：用户只能读取自己的订阅
CREATE POLICY "allow_read_own_subscriptions" ON public.pay_user_subscriptions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 用户积分表：用户只能读取自己的积分
CREATE POLICY "allow_read_own_credits" ON public.pay_user_credits
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. 确保套餐数据存在
INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features, is_active, sort_order) VALUES
('free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": false, "templates": "basic", "editing_tools": "basic"}', true, 1),
('starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple"}', true, 2),
('advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "normal"}', true, 3),
('professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "high"}', true, 4),
('lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "highest", "dedicated_manager": true}', true, 5)
ON CONFLICT (plan_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  credits_monthly = EXCLUDED.credits_monthly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 5. 为当前用户创建积分记录（如果不存在）
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
  100, -- 给新用户100个免费积分
  0,
  100,
  100,
  NOW() + INTERVAL '1 month'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.pay_user_credits WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 6. 验证修复结果
SELECT 'RLS策略创建完成' as status;
SELECT COUNT(*) as plan_count FROM public.pay_subscription_plans;
SELECT COUNT(*) as user_credits_count FROM public.pay_user_credits;
