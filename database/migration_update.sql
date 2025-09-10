-- AicePS 数据库迁移更新脚本
-- 从 aiceps_database_schema_fixed.sql 更新到最新版本
-- 执行时间: 2025-09-10
-- 说明: 此脚本将现有数据库结构更新为包含新功能的最新版本

-- =================================
-- 1. 添加新表：用户配置表 (user_profiles)
-- =================================
-- 这个表在原始 aiceps_database_schema_fixed.sql 中不存在

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

-- =================================
-- 2. 添加新表：用户项目表 (nano_user_projects)
-- =================================

CREATE TABLE IF NOT EXISTS public.nano_user_projects (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_data JSON NULL DEFAULT '{}'::JSON,
    thumbnail_url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT nano_user_projects_pkey PRIMARY KEY (id)
);

-- 添加项目表注释
COMMENT ON TABLE public.nano_user_projects IS 'Nano用户项目表，存储用户的图像编辑项目';
COMMENT ON COLUMN public.nano_user_projects.id IS '项目唯一标识符';
COMMENT ON COLUMN public.nano_user_projects.user_id IS '项目所属用户ID';
COMMENT ON COLUMN public.nano_user_projects.project_name IS '项目名称';
COMMENT ON COLUMN public.nano_user_projects.project_data IS '项目数据JSON格式';
COMMENT ON COLUMN public.nano_user_projects.thumbnail_url IS '项目缩略图URL';
COMMENT ON COLUMN public.nano_user_projects.created_at IS '项目创建时间';
COMMENT ON COLUMN public.nano_user_projects.updated_at IS '项目最后更新时间';

-- 创建项目表索引
CREATE INDEX IF NOT EXISTS idx_nano_user_projects_user_id ON public.nano_user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_nano_user_projects_created_at ON public.nano_user_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_nano_user_projects_name ON public.nano_user_projects(project_name);

-- =================================
-- 3. 添加新表：用户使用统计表 (nano_user_usage_stats)
-- =================================

CREATE TABLE IF NOT EXISTS public.nano_user_usage_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_count INTEGER NOT NULL DEFAULT 1,
    last_action_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT nano_user_usage_stats_pkey PRIMARY KEY (id)
);

-- 添加使用统计表注释
COMMENT ON TABLE public.nano_user_usage_stats IS 'Nano用户使用统计表，记录用户各种操作的使用情况';
COMMENT ON COLUMN public.nano_user_usage_stats.id IS '统计记录唯一标识符';
COMMENT ON COLUMN public.nano_user_usage_stats.user_id IS '用户ID';
COMMENT ON COLUMN public.nano_user_usage_stats.action_type IS '操作类型（adjust、filter、crop、fusion等）';
COMMENT ON COLUMN public.nano_user_usage_stats.action_count IS '操作次数';
COMMENT ON COLUMN public.nano_user_usage_stats.last_action_at IS '最后操作时间';
COMMENT ON COLUMN public.nano_user_usage_stats.created_at IS '记录创建时间';

-- 创建使用统计表索引
CREATE INDEX IF NOT EXISTS idx_nano_user_usage_stats_user_id ON public.nano_user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_nano_user_usage_stats_action_type ON public.nano_user_usage_stats(action_type);
CREATE INDEX IF NOT EXISTS idx_nano_user_usage_stats_last_action ON public.nano_user_usage_stats(last_action_at);

-- =================================
-- 4. 修改现有表：更新外键引用
-- =================================

-- 检查并更新 pay_user_subscriptions 表的外键引用
-- 原表引用 users(id)，新版本引用 auth.users(id)

-- 首先删除旧的外键约束（如果存在）
DO $$
BEGIN
    -- 检查是否存在对 users 表的外键约束
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_user_subscriptions_user_id%' 
        AND table_name = 'pay_user_subscriptions'
    ) THEN
        ALTER TABLE pay_user_subscriptions DROP CONSTRAINT IF EXISTS pay_user_subscriptions_user_id_fkey;
    END IF;
END $$;

-- 添加新的外键约束到 auth.users
ALTER TABLE pay_user_subscriptions 
ADD CONSTRAINT pay_user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 对其他支付相关表执行相同操作
DO $$
BEGIN
    -- pay_user_credits 表
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_user_credits_user_id%' 
        AND table_name = 'pay_user_credits'
    ) THEN
        ALTER TABLE pay_user_credits DROP CONSTRAINT IF EXISTS pay_user_credits_user_id_fkey;
    END IF;
END $$;

ALTER TABLE pay_user_credits 
ADD CONSTRAINT pay_user_credits_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pay_credit_transactions 表
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_credit_transactions_user_id%' 
        AND table_name = 'pay_credit_transactions'
    ) THEN
        ALTER TABLE pay_credit_transactions DROP CONSTRAINT IF EXISTS pay_credit_transactions_user_id_fkey;
    END IF;
END $$;

ALTER TABLE pay_credit_transactions 
ADD CONSTRAINT pay_credit_transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pay_feature_usage 表
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_feature_usage_user_id%' 
        AND table_name = 'pay_feature_usage'
    ) THEN
        ALTER TABLE pay_feature_usage DROP CONSTRAINT IF EXISTS pay_feature_usage_user_id_fkey;
    END IF;
END $$;

ALTER TABLE pay_feature_usage 
ADD CONSTRAINT pay_feature_usage_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pay_payment_orders 表
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_payment_orders_user_id%' 
        AND table_name = 'pay_payment_orders'
    ) THEN
        ALTER TABLE pay_payment_orders DROP CONSTRAINT IF EXISTS pay_payment_orders_user_id_fkey;
    END IF;
END $$;

ALTER TABLE pay_payment_orders 
ADD CONSTRAINT pay_payment_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pay_refunds 表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%pay_refunds_user_id%' 
        AND table_name = 'pay_refunds'
    ) THEN
        ALTER TABLE pay_refunds DROP CONSTRAINT IF EXISTS pay_refunds_user_id_fkey;
    END IF;
END $$;

-- 如果 pay_refunds 表存在，添加新的外键约束
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_refunds') THEN
        ALTER TABLE pay_refunds 
        ADD CONSTRAINT pay_refunds_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =================================
-- 5. 添加新的存储过程和函数
-- =================================

-- 用户配置表的更新触发器函数
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
DROP TRIGGER IF EXISTS trigger_update_nano_user_projects_updated_at ON public.nano_user_projects;
CREATE TRIGGER trigger_update_nano_user_projects_updated_at
    BEFORE UPDATE ON public.nano_user_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 自动同步用户配置的函数
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

-- 更新积分管理存储过程（修复 schema 引用）
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

-- 添加用户积分的存储过程
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50) DEFAULT 'manual',
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
        VALUES (p_user_id, p_amount, 0, p_amount, 0);
        v_new_balance := p_amount;
    ELSE
        v_new_balance := v_current_credits + p_amount;
        
        UPDATE public.pay_user_credits 
        SET 
            total_credits = total_credits + p_amount,
            available_credits = v_new_balance,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    INSERT INTO public.pay_credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_after, 
        source, 
        description
    ) VALUES (
        p_user_id,
        'earn',
        p_amount,
        v_new_balance,
        p_source,
        COALESCE(p_description, '获得积分')
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, '积分添加成功'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =================================
-- 6. 启用行级安全策略 (RLS)
-- =================================

-- 启用新表的行级安全策略
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nano_user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nano_user_usage_stats ENABLE ROW LEVEL SECURITY;

-- 创建用户配置表的安全策略
DROP POLICY IF EXISTS "用户只能查看和更新自己的配置" ON public.user_profiles;
CREATE POLICY "用户只能查看和更新自己的配置" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- 创建项目表的安全策略
DROP POLICY IF EXISTS "用户只能管理自己的项目" ON public.nano_user_projects;
CREATE POLICY "用户只能管理自己的项目" ON public.nano_user_projects
    FOR ALL USING (auth.uid() = user_id);

-- 创建使用统计表的安全策略
DROP POLICY IF EXISTS "用户只能查看自己的使用统计" ON public.nano_user_usage_stats;
CREATE POLICY "用户只能查看自己的使用统计" ON public.nano_user_usage_stats
    FOR ALL USING (auth.uid() = user_id);

-- 更新支付相关表的安全策略
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.pay_user_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON public.pay_user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own credits" ON public.pay_user_credits;
CREATE POLICY "Users can manage own credits" ON public.pay_user_credits
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.pay_credit_transactions;
CREATE POLICY "Users can view own credit transactions" ON public.pay_credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own feature usage" ON public.pay_feature_usage;
CREATE POLICY "Users can manage own feature usage" ON public.pay_feature_usage
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own payment orders" ON public.pay_payment_orders;
CREATE POLICY "Users can manage own payment orders" ON public.pay_payment_orders
    FOR ALL USING (auth.uid() = user_id);

-- 所有人都可以查看套餐信息
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.pay_subscription_plans;
CREATE POLICY "Anyone can view subscription plans" ON public.pay_subscription_plans
    FOR SELECT USING (true);

-- =================================
-- 7. 添加缺失的索引
-- =================================

-- 添加功能使用记录表的状态索引
CREATE INDEX IF NOT EXISTS idx_pay_feature_usage_status ON public.pay_feature_usage(status);

-- =================================
-- 8. 更新套餐数据（添加免费版）
-- =================================

-- 插入免费版套餐（如果不存在）
INSERT INTO public.pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": true, "veo3_video": false, "sticker": true, "batch_processing": false, "professional_canvas": false, "all_templates": false}'
WHERE NOT EXISTS (SELECT 1 FROM public.pay_subscription_plans WHERE plan_code = 'free');

-- =================================
-- 9. 清理：删除不再需要的表（如果存在）
-- =================================

-- 如果存在原始的 users 表（非 auth.users），可以选择删除
-- 注意：只有在确认不需要时才执行此操作
-- DROP TABLE IF EXISTS users CASCADE;

-- =================================
-- 执行完成提示
-- =================================

-- 数据库迁移完成！
-- 
-- 主要更新内容：
-- 1. 添加了用户配置表 (user_profiles)
-- 2. 添加了用户项目表 (nano_user_projects) 
-- 3. 添加了用户使用统计表 (nano_user_usage_stats)
-- 4. 更新了所有外键引用指向 auth.users
-- 5. 添加了完整的 RLS 安全策略
-- 6. 更新了存储过程和触发器
-- 7. 添加了免费版套餐
-- 
-- 注意事项：
-- 1. 所有新表都启用了行级安全策略
-- 2. 外键约束已更新为正确引用 auth.users
-- 3. 包含了完整的积分管理功能
-- 4. 支持用户配置自动同步
