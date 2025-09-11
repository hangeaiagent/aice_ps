-- 创建支付相关表的脚本
-- 这些表是价格页面和用户管理功能所必需的

-- =================================
-- 1. 会员套餐表
-- =================================
CREATE TABLE IF NOT EXISTS public.pay_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    plan_name_en VARCHAR(100) NOT NULL,
    description TEXT,
    description_en TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    credits_monthly INTEGER NOT NULL,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.pay_subscription_plans IS '会员套餐表';

-- =================================
-- 2. 用户订阅表
-- =================================
CREATE TABLE IF NOT EXISTS public.pay_user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.pay_subscription_plans(id),
    subscription_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    payment_method VARCHAR(50),
    external_subscription_id VARCHAR(255),
    trial_end_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.pay_user_subscriptions IS '用户订阅表';

-- =================================
-- 3. 积分账户表
-- =================================
CREATE TABLE IF NOT EXISTS public.pay_user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_credits INTEGER DEFAULT 0,
    used_credits INTEGER DEFAULT 0,
    available_credits INTEGER DEFAULT 0,
    monthly_quota INTEGER DEFAULT 0,
    quota_reset_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.pay_user_credits IS '积分账户表';

-- =================================
-- 4. 创建索引
-- =================================
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_user_id ON public.pay_user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_status ON public.pay_user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pay_user_credits_user_id ON public.pay_user_credits(user_id);

-- =================================
-- 5. 初始化套餐数据
-- =================================
INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features) VALUES
('free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": false, "templates": "basic", "editing_tools": "basic"}'),
('starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple"}'),
('advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "normal"}'),
('professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "high"}'),
('lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "highest", "dedicated_manager": true}')
ON CONFLICT (plan_code) DO NOTHING;

-- =================================
-- 6. 启用行级安全 (RLS)
-- =================================
ALTER TABLE public.pay_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_credits ENABLE ROW LEVEL SECURITY;

-- =================================
-- 7. 创建RLS策略
-- =================================

-- 套餐表：所有人可读
CREATE POLICY "pay_subscription_plans_select" ON public.pay_subscription_plans
    FOR SELECT USING (true);

-- 用户订阅表：用户只能查看自己的订阅
CREATE POLICY "pay_user_subscriptions_select" ON public.pay_user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pay_user_subscriptions_insert" ON public.pay_user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pay_user_subscriptions_update" ON public.pay_user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- 积分表：用户只能查看自己的积分
CREATE POLICY "pay_user_credits_select" ON public.pay_user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pay_user_credits_insert" ON public.pay_user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pay_user_credits_update" ON public.pay_user_credits
    FOR UPDATE USING (auth.uid() = user_id);
