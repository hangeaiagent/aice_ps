-- AicePS 支付和会员管理数据库结构
-- 基于 Supabase 数据库系统，集成用户认证和支付功能
-- 版本: v1.0
-- 创建时间: 2025-09-10

-- =================================
-- 1. 会员套餐表
-- =================================
CREATE TABLE IF NOT EXISTS pay_subscription_plans (
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

-- 添加表注释
COMMENT ON TABLE pay_subscription_plans IS '会员套餐表';
COMMENT ON COLUMN pay_subscription_plans.id IS '套餐唯一标识符';
COMMENT ON COLUMN pay_subscription_plans.plan_code IS '套餐代码：free, starter, advanced, professional, lifetime';
COMMENT ON COLUMN pay_subscription_plans.plan_name IS '套餐中文名称';
COMMENT ON COLUMN pay_subscription_plans.plan_name_en IS '套餐英文名称';
COMMENT ON COLUMN pay_subscription_plans.description IS '套餐中文描述';
COMMENT ON COLUMN pay_subscription_plans.description_en IS '套餐英文描述';
COMMENT ON COLUMN pay_subscription_plans.price_monthly IS '月付价格';
COMMENT ON COLUMN pay_subscription_plans.price_yearly IS '年付价格';
COMMENT ON COLUMN pay_subscription_plans.credits_monthly IS '月度积分额度';
COMMENT ON COLUMN pay_subscription_plans.features IS '功能列表JSON格式';
COMMENT ON COLUMN pay_subscription_plans.is_active IS '是否启用';
COMMENT ON COLUMN pay_subscription_plans.sort_order IS '排序顺序';

-- =================================
-- 2. 用户订阅表
-- =================================
CREATE TABLE IF NOT EXISTS pay_user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES pay_subscription_plans(id),
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

-- 添加表注释
COMMENT ON TABLE pay_user_subscriptions IS '用户订阅表';
COMMENT ON COLUMN pay_user_subscriptions.id IS '订阅记录唯一标识符';
COMMENT ON COLUMN pay_user_subscriptions.user_id IS '用户ID，关联认证用户表';
COMMENT ON COLUMN pay_user_subscriptions.plan_id IS '套餐ID，关联套餐表';
COMMENT ON COLUMN pay_user_subscriptions.subscription_type IS '订阅类型：monthly月付, yearly年付, lifetime终身';
COMMENT ON COLUMN pay_user_subscriptions.status IS '订阅状态：active激活, cancelled已取消, expired已过期, pending待激活';
COMMENT ON COLUMN pay_user_subscriptions.start_date IS '订阅开始时间';
COMMENT ON COLUMN pay_user_subscriptions.end_date IS '订阅结束时间';
COMMENT ON COLUMN pay_user_subscriptions.auto_renew IS '是否自动续费';
COMMENT ON COLUMN pay_user_subscriptions.payment_method IS '支付方式：paypal, stripe, alipay';
COMMENT ON COLUMN pay_user_subscriptions.external_subscription_id IS '外部支付平台订阅ID';
COMMENT ON COLUMN pay_user_subscriptions.trial_end_date IS '试用期结束时间';
COMMENT ON COLUMN pay_user_subscriptions.cancelled_at IS '取消时间';

-- =================================
-- 3. 积分账户表
-- =================================
CREATE TABLE IF NOT EXISTS pay_user_credits (
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

-- 添加表注释
COMMENT ON TABLE pay_user_credits IS '积分账户表';
COMMENT ON COLUMN pay_user_credits.id IS '积分账户唯一标识符';
COMMENT ON COLUMN pay_user_credits.user_id IS '用户ID，关联认证用户表，每用户唯一';
COMMENT ON COLUMN pay_user_credits.total_credits IS '总积分数量';
COMMENT ON COLUMN pay_user_credits.used_credits IS '已使用积分数量';
COMMENT ON COLUMN pay_user_credits.available_credits IS '可用积分数量';
COMMENT ON COLUMN pay_user_credits.monthly_quota IS '月度积分配额';
COMMENT ON COLUMN pay_user_credits.quota_reset_date IS '配额重置日期';

-- =================================
-- 4. 积分交易记录表
-- =================================
CREATE TABLE IF NOT EXISTS pay_credit_transactions (
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

-- 添加表注释
COMMENT ON TABLE pay_credit_transactions IS '积分交易记录表';
COMMENT ON COLUMN pay_credit_transactions.id IS '积分交易记录唯一标识符';
COMMENT ON COLUMN pay_credit_transactions.user_id IS '用户ID，关联认证用户表';
COMMENT ON COLUMN pay_credit_transactions.transaction_type IS '交易类型：earn获得, spend消费, refund退款, expire过期';
COMMENT ON COLUMN pay_credit_transactions.amount IS '积分变动数量，正数为获得，负数为消费';
COMMENT ON COLUMN pay_credit_transactions.balance_after IS '交易后积分余额';
COMMENT ON COLUMN pay_credit_transactions.source IS '积分来源：subscription订阅, purchase购买, refund退款, usage使用';
COMMENT ON COLUMN pay_credit_transactions.source_id IS '关联的订单ID或使用记录ID';
COMMENT ON COLUMN pay_credit_transactions.description IS '交易描述说明';
COMMENT ON COLUMN pay_credit_transactions.metadata IS '额外元数据JSON格式';

-- =================================
-- 5. 功能使用记录表
-- =================================
CREATE TABLE IF NOT EXISTS pay_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    credits_consumed INTEGER NOT NULL DEFAULT 0,
    usage_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 添加表注释
COMMENT ON TABLE pay_feature_usage IS '功能使用记录表';
COMMENT ON COLUMN pay_feature_usage.id IS '功能使用记录唯一标识符';
COMMENT ON COLUMN pay_feature_usage.user_id IS '用户ID，关联认证用户表';
COMMENT ON COLUMN pay_feature_usage.feature_type IS '功能类型：nano_banana图片生成, veo3_video视频生成, sticker贴纸制作, batch_processing批量处理';
COMMENT ON COLUMN pay_feature_usage.credits_consumed IS '消耗的积分数量';
COMMENT ON COLUMN pay_feature_usage.usage_data IS '使用详情JSON格式（图片尺寸、视频时长等）';
COMMENT ON COLUMN pay_feature_usage.status IS '使用状态：pending处理中, completed已完成, failed失败';
COMMENT ON COLUMN pay_feature_usage.completed_at IS '完成时间';

-- =================================
-- 6. 支付订单表
-- =================================
CREATE TABLE IF NOT EXISTS pay_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES pay_subscription_plans(id),
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

-- 添加表注释
COMMENT ON TABLE pay_payment_orders IS '支付订单表';
COMMENT ON COLUMN pay_payment_orders.id IS '支付订单唯一标识符';
COMMENT ON COLUMN pay_payment_orders.order_no IS '订单号，系统生成唯一编号';
COMMENT ON COLUMN pay_payment_orders.user_id IS '用户ID，关联认证用户表';
COMMENT ON COLUMN pay_payment_orders.plan_id IS '套餐ID，关联套餐表';
COMMENT ON COLUMN pay_payment_orders.amount IS '订单金额';
COMMENT ON COLUMN pay_payment_orders.currency IS '货币类型，默认美元';
COMMENT ON COLUMN pay_payment_orders.payment_method IS '支付方式：paypal, stripe';
COMMENT ON COLUMN pay_payment_orders.payment_status IS '支付状态：pending待支付, completed已完成, failed失败, cancelled已取消, refunded已退款';
COMMENT ON COLUMN pay_payment_orders.external_order_id IS '外部支付平台订单ID';
COMMENT ON COLUMN pay_payment_orders.external_payment_id IS '外部支付平台支付ID';
COMMENT ON COLUMN pay_payment_orders.payment_data IS '支付平台返回的详细数据JSON格式';
COMMENT ON COLUMN pay_payment_orders.paid_at IS '支付完成时间';

-- =================================
-- 7. 索引创建
-- =================================

-- 订阅相关索引
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_user_id ON pay_user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_status ON pay_user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pay_user_subscriptions_end_date ON pay_user_subscriptions(end_date);

-- 积分相关索引
CREATE INDEX IF NOT EXISTS idx_pay_user_credits_user_id ON pay_user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_credit_transactions_user_id ON pay_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_credit_transactions_created_at ON pay_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pay_feature_usage_user_id ON pay_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_feature_usage_created_at ON pay_feature_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_pay_feature_usage_status ON pay_feature_usage(status);

-- 支付相关索引
CREATE INDEX IF NOT EXISTS idx_pay_payment_orders_user_id ON pay_payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_payment_orders_status ON pay_payment_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_pay_payment_orders_created_at ON pay_payment_orders(created_at);

-- =================================
-- 8. 存储过程和函数
-- =================================

-- 消费用户积分的存储过程
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
    -- 检查用户积分余额
    SELECT pay_user_credits.available_credits 
    INTO v_current_credits
    FROM pay_user_credits 
    WHERE user_id = p_user_id;
    
    -- 如果用户积分记录不存在，创建一个
    IF v_current_credits IS NULL THEN
        INSERT INTO pay_user_credits (user_id, total_credits, used_credits, available_credits, monthly_quota)
        VALUES (p_user_id, 0, 0, 0, 0);
        v_current_credits := 0;
    END IF;
    
    -- 检查积分是否足够
    IF v_current_credits < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_credits, '积分不足'::TEXT;
        RETURN;
    END IF;
    
    -- 扣除积分
    v_new_balance := v_current_credits - p_amount;
    
    UPDATE pay_user_credits 
    SET 
        used_credits = used_credits + p_amount,
        available_credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 记录积分交易
    INSERT INTO pay_credit_transactions (
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
    -- 获取当前积分余额
    SELECT pay_user_credits.available_credits 
    INTO v_current_credits
    FROM pay_user_credits 
    WHERE user_id = p_user_id;
    
    -- 如果用户积分记录不存在，创建一个
    IF v_current_credits IS NULL THEN
        INSERT INTO pay_user_credits (user_id, total_credits, used_credits, available_credits, monthly_quota)
        VALUES (p_user_id, p_amount, 0, p_amount, 0);
        v_new_balance := p_amount;
    ELSE
        -- 更新积分
        v_new_balance := v_current_credits + p_amount;
        
        UPDATE pay_user_credits 
        SET 
            total_credits = total_credits + p_amount,
            available_credits = v_new_balance,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- 记录积分交易
    INSERT INTO pay_credit_transactions (
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
-- 9. 初始化数据
-- =================================

-- 插入免费套餐（如果不存在）
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'free', '免费版', 'Free', 0.00, 0.00, 0, '{"nano_banana": true, "veo3_video": false, "sticker": true, "batch_processing": false, "professional_canvas": false, "all_templates": false}'
WHERE NOT EXISTS (SELECT 1 FROM pay_subscription_plans WHERE plan_code = 'free');

-- 插入入门版套餐（如果不存在）
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": false, "professional_canvas": false, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM pay_subscription_plans WHERE plan_code = 'starter');

-- 插入进阶版套餐（如果不存在）
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": false, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM pay_subscription_plans WHERE plan_code = 'advanced');

-- 插入专业版套餐（如果不存在）
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": true, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM pay_subscription_plans WHERE plan_code = 'professional');

-- 插入买断版套餐（如果不存在）
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features)
SELECT 'lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "batch_processing": true, "professional_canvas": true, "all_templates": true}'
WHERE NOT EXISTS (SELECT 1 FROM pay_subscription_plans WHERE plan_code = 'lifetime');

-- =================================
-- 10. 权限设置 (RLS - Row Level Security)
-- =================================

-- 启用行级安全策略
ALTER TABLE pay_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_payment_orders ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的订阅信息
CREATE POLICY IF NOT EXISTS "Users can view own subscriptions" ON pay_user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own subscriptions" ON pay_user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own subscriptions" ON pay_user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能访问自己的积分信息
CREATE POLICY IF NOT EXISTS "Users can view own credits" ON pay_user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own credits" ON pay_user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own credits" ON pay_user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能访问自己的积分交易记录
CREATE POLICY IF NOT EXISTS "Users can view own credit transactions" ON pay_credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own credit transactions" ON pay_credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能访问自己的功能使用记录
CREATE POLICY IF NOT EXISTS "Users can view own feature usage" ON pay_feature_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own feature usage" ON pay_feature_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own feature usage" ON pay_feature_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能访问自己的支付订单
CREATE POLICY IF NOT EXISTS "Users can view own payment orders" ON pay_payment_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own payment orders" ON pay_payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own payment orders" ON pay_payment_orders
    FOR UPDATE USING (auth.uid() = user_id);

-- 所有人都可以查看套餐信息
CREATE POLICY IF NOT EXISTS "Anyone can view subscription plans" ON pay_subscription_plans
    FOR SELECT USING (true);

-- =================================
-- 执行完成
-- =================================

-- 数据库结构创建完成！
-- 注意事项：
-- 1. 此脚本基于 Supabase 认证系统，使用 auth.users 表
-- 2. 启用了行级安全策略，确保数据隔离
-- 3. 包含完整的积分管理和支付流程
-- 4. 支持多种套餐类型和功能权限控制