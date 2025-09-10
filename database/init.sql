-- AicePS 项目数据库初始化脚本
-- 基于 Supabase PostgreSQL 数据库

-- 创建用户表（扩展 Supabase Auth 的用户信息）
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL DEFAULT auth.uid(),
    email TEXT NOT NULL,
    display_name TEXT NULL,
    avatar_url TEXT NULL,
    provider TEXT NOT NULL DEFAULT 'email'::TEXT,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    preferences JSON NULL DEFAULT '{}'::JSON,
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_email_key UNIQUE (email)
);

-- 添加表注释
COMMENT ON TABLE public.user_profiles IS '用户配置表，扩展 Supabase Auth 用户信息';

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.id IS '用户唯一标识符，与 Supabase Auth 用户ID关联';
COMMENT ON COLUMN public.user_profiles.email IS '用户邮箱地址';
COMMENT ON COLUMN public.user_profiles.display_name IS '用户显示名称';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '用户头像URL';
COMMENT ON COLUMN public.user_profiles.provider IS '认证提供商（email、google、github等）';
COMMENT ON COLUMN public.user_profiles.created_at IS '用户创建时间';
COMMENT ON COLUMN public.user_profiles.updated_at IS '用户信息最后更新时间';
COMMENT ON COLUMN public.user_profiles.last_sign_in IS '用户最后登录时间';
COMMENT ON COLUMN public.user_profiles.preferences IS '用户偏好设置JSON数据';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON public.user_profiles(provider);

-- 创建用户项目表
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_data JSON NULL DEFAULT '{}'::JSON,
    thumbnail_url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT user_projects_pkey PRIMARY KEY (id)
);

-- 添加项目表注释
COMMENT ON TABLE public.user_projects IS '用户项目表，存储用户的图像编辑项目';
COMMENT ON COLUMN public.user_projects.id IS '项目唯一标识符';
COMMENT ON COLUMN public.user_projects.user_id IS '项目所属用户ID';
COMMENT ON COLUMN public.user_projects.project_name IS '项目名称';
COMMENT ON COLUMN public.user_projects.project_data IS '项目数据JSON格式';
COMMENT ON COLUMN public.user_projects.thumbnail_url IS '项目缩略图URL';
COMMENT ON COLUMN public.user_projects.created_at IS '项目创建时间';
COMMENT ON COLUMN public.user_projects.updated_at IS '项目最后更新时间';

-- 创建项目表索引
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_created_at ON public.user_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_user_projects_name ON public.user_projects(project_name);

-- 创建用户使用统计表
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_count INTEGER NOT NULL DEFAULT 1,
    last_action_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT user_usage_stats_pkey PRIMARY KEY (id)
);

-- 添加使用统计表注释
COMMENT ON TABLE public.user_usage_stats IS '用户使用统计表，记录用户各种操作的使用情况';
COMMENT ON COLUMN public.user_usage_stats.id IS '统计记录唯一标识符';
COMMENT ON COLUMN public.user_usage_stats.user_id IS '用户ID';
COMMENT ON COLUMN public.user_usage_stats.action_type IS '操作类型（adjust、filter、crop、fusion等）';
COMMENT ON COLUMN public.user_usage_stats.action_count IS '操作次数';
COMMENT ON COLUMN public.user_usage_stats.last_action_at IS '最后操作时间';
COMMENT ON COLUMN public.user_usage_stats.created_at IS '记录创建时间';

-- 创建使用统计表索引
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_action_type ON public.user_usage_stats(action_type);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_last_action ON public.user_usage_stats(last_action_at);

-- 创建用户配置表的更新触发器函数
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 创建项目表的更新触发器
DROP TRIGGER IF EXISTS trigger_update_user_projects_updated_at ON public.user_projects;
CREATE TRIGGER trigger_update_user_projects_updated_at
    BEFORE UPDATE ON public.user_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 启用行级安全策略（RLS）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_stats ENABLE ROW LEVEL SECURITY;

-- 创建用户配置表的安全策略
CREATE POLICY "用户只能查看和更新自己的配置" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- 创建项目表的安全策略
CREATE POLICY "用户只能管理自己的项目" ON public.user_projects
    FOR ALL USING (auth.uid() = user_id);

-- 创建使用统计表的安全策略
CREATE POLICY "用户只能查看自己的使用统计" ON public.user_usage_stats
    FOR ALL USING (auth.uid() = user_id);

-- 创建自动同步用户配置的函数
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        display_name, 
        avatar_url, 
        provider,
        created_at,
        last_sign_in
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        NEW.created_at,
        NEW.last_sign_in_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        avatar_url = NEW.raw_user_meta_data->>'avatar_url',
        last_sign_in = NEW.last_sign_in_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户注册时自动同步配置的触发器
DROP TRIGGER IF EXISTS trigger_sync_user_profile ON auth.users;
CREATE TRIGGER trigger_sync_user_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();

-- =================================
-- 支付和会员管理系统数据库结构
-- =================================

-- 会员套餐表
CREATE TABLE IF NOT EXISTS public.pay_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    plan_name_en VARCHAR(100) NOT NULL,
    description TEXT,
    description_en TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    credits_monthly INTEGER NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户订阅表
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

-- 积分账户表
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

-- 积分交易记录表
CREATE TABLE IF NOT EXISTS public.pay_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 功能使用记录表
CREATE TABLE IF NOT EXISTS public.pay_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    credits_consumed INTEGER NOT NULL DEFAULT 0,
    usage_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 支付订单表
CREATE TABLE IF NOT EXISTS public.pay_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.pay_subscription_plans(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    external_order_id VARCHAR(255),
    external_payment_id VARCHAR(255),
    payment_data JSONB DEFAULT '{}',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付相关索引
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_user_id ON public.pay_user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_status ON public.pay_user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pay_user_credits_user_id ON public.pay_user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_credit_transactions_user_id ON public.pay_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_feature_usage_user_id ON public.pay_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_payment_orders_user_id ON public.pay_payment_orders(user_id);

-- 支付相关RLS策略
ALTER TABLE public.pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_payment_orders ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的支付数据
CREATE POLICY IF NOT EXISTS "Users can manage own subscriptions" ON public.pay_user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own credits" ON public.pay_user_credits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own credit transactions" ON public.pay_credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own feature usage" ON public.pay_feature_usage
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own payment orders" ON public.pay_payment_orders
    FOR ALL USING (auth.uid() = user_id);

-- 所有人都可以查看套餐信息
CREATE POLICY IF NOT EXISTS "Anyone can view subscription plans" ON public.pay_subscription_plans
    FOR SELECT USING (true);

-- 积分管理存储过程
CREATE OR REPLACE FUNCTION consume_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_feature_type VARCHAR(50),
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    available_credits INTEGER,
    message TEXT
) AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    SELECT public.pay_user_credits.available_credits 
    INTO v_current_credits
    FROM public.pay_user_credits 
    WHERE user_id = p_user_id;
    
    IF v_current_credits IS NULL THEN
        INSERT INTO public.pay_user_credits (user_id, total_credits, used_credits, available_credits, monthly_quota)
        VALUES (p_user_id, 0, 0, 0, 0);
        v_current_credits := 0;
    END IF;
    
    IF v_current_credits < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_credits, '积分不足'::TEXT;
        RETURN;
    END IF;
    
    v_new_balance := v_current_credits - p_amount;
    
    UPDATE public.pay_user_credits 
    SET 
        used_credits = used_credits + p_amount,
        available_credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    INSERT INTO public.pay_credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_after, 
        source, 
        description
    ) VALUES (
        p_user_id,
        'spend',
        -p_amount,
        v_new_balance,
        'usage',
        COALESCE(p_description, '使用 ' || p_feature_type || ' 功能消费积分')
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, '积分消费成功'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 初始化套餐数据
INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": true, "veo3_video": false, "sticker": true, "batch_processing": false, "professional_canvas": false, "all_templates": false}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'free');

INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": false, "professional_canvas": false, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'starter');

INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": false, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'advanced');

INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": true, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'professional');

INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": true, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'lifetime');