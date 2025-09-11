-- AicePS 会员管理数据库结构 - 完整SQL脚本
-- 基于 Supabase 数据库系统，所有表使用 UUID 主键
-- 修复版本：使用正确的 PostgreSQL COMMENT 语法

-- =================================
-- 1. 用户表 (基于 Supabase auth.users)
-- =================================
-- 注意：Supabase 的 auth.users 表由系统管理，此处仅作参考
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE,
    confirmation_token VARCHAR(255),
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    recovery_token VARCHAR(255),
    recovery_sent_at TIMESTAMP WITH TIME ZONE,
    email_change_token_new VARCHAR(255),
    email_change VARCHAR(255),
    email_change_sent_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(15),
    phone_confirmed_at TIMESTAMP WITH TIME ZONE,
    phone_change VARCHAR(15),
    phone_change_token VARCHAR(255),
    phone_change_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    email_change_token_current VARCHAR(255),
    email_change_confirm_status SMALLINT,
    banned_until TIMESTAMP WITH TIME ZONE,
    reauthentication_token VARCHAR(255),
    reauthentication_sent_at TIMESTAMP WITH TIME ZONE,
    is_sso_user BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_anonymous BOOLEAN DEFAULT false
);

COMMENT ON TABLE users IS '用户表-基于Supabase认证系统';
COMMENT ON COLUMN users.id IS '用户唯一标识符';
COMMENT ON COLUMN users.email IS '用户邮箱地址';
COMMENT ON COLUMN users.encrypted_password IS '加密后的密码';
COMMENT ON COLUMN users.email_confirmed_at IS '邮箱确认时间';
COMMENT ON COLUMN users.invited_at IS '邀请时间';
COMMENT ON COLUMN users.confirmation_token IS '邮箱确认令牌';
COMMENT ON COLUMN users.confirmation_sent_at IS '确认邮件发送时间';
COMMENT ON COLUMN users.recovery_token IS '密码重置令牌';
COMMENT ON COLUMN users.recovery_sent_at IS '重置邮件发送时间';
COMMENT ON COLUMN users.email_change_token_new IS '新邮箱变更令牌';
COMMENT ON COLUMN users.email_change IS '待变更的新邮箱';
COMMENT ON COLUMN users.email_change_sent_at IS '邮箱变更邮件发送时间';
COMMENT ON COLUMN users.last_sign_in_at IS '最后登录时间';
COMMENT ON COLUMN users.raw_app_meta_data IS '应用元数据';
COMMENT ON COLUMN users.raw_user_meta_data IS '用户元数据';
COMMENT ON COLUMN users.is_super_admin IS '是否为超级管理员';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
COMMENT ON COLUMN users.phone IS '手机号码';
COMMENT ON COLUMN users.phone_confirmed_at IS '手机号确认时间';
COMMENT ON COLUMN users.phone_change IS '待变更的新手机号';
COMMENT ON COLUMN users.phone_change_token IS '手机号变更令牌';
COMMENT ON COLUMN users.phone_change_sent_at IS '手机号变更短信发送时间';
COMMENT ON COLUMN users.confirmed_at IS '账户确认时间';
COMMENT ON COLUMN users.email_change_token_current IS '当前邮箱变更令牌';
COMMENT ON COLUMN users.email_change_confirm_status IS '邮箱变更确认状态';
COMMENT ON COLUMN users.banned_until IS '封禁截止时间';
COMMENT ON COLUMN users.reauthentication_token IS '重新认证令牌';
COMMENT ON COLUMN users.reauthentication_sent_at IS '重新认证邮件发送时间';
COMMENT ON COLUMN users.is_sso_user IS '是否为SSO用户';
COMMENT ON COLUMN users.deleted_at IS '删除时间';
COMMENT ON COLUMN users.is_anonymous IS '是否为匿名用户';

-- =================================
-- 2. 会员套餐表
-- =================================
CREATE TABLE pay_subscription_plans (
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

COMMENT ON TABLE pay_subscription_plans IS '会员套餐表';
COMMENT ON COLUMN pay_subscription_plans.id IS '套餐唯一标识符';
COMMENT ON COLUMN pay_subscription_plans.plan_code IS '套餐代码：starter, advanced, professional, lifetime';
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
COMMENT ON COLUMN pay_subscription_plans.created_at IS '创建时间';
COMMENT ON COLUMN pay_subscription_plans.updated_at IS '更新时间';

-- =================================
-- 3. 用户订阅表
-- =================================
CREATE TABLE pay_user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

COMMENT ON TABLE pay_user_subscriptions IS '用户订阅表';
COMMENT ON COLUMN pay_user_subscriptions.id IS '订阅记录唯一标识符';
COMMENT ON COLUMN pay_user_subscriptions.user_id IS '用户ID，关联用户表';
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
COMMENT ON COLUMN pay_user_subscriptions.created_at IS '创建时间';
COMMENT ON COLUMN pay_user_subscriptions.updated_at IS '更新时间';

-- =================================
-- 4. 积分账户表
-- =================================
CREATE TABLE pay_user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_credits INTEGER DEFAULT 0,
    used_credits INTEGER DEFAULT 0,
    available_credits INTEGER DEFAULT 0,
    monthly_quota INTEGER DEFAULT 0,
    quota_reset_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pay_user_credits IS '积分账户表';
COMMENT ON COLUMN pay_user_credits.id IS '积分账户唯一标识符';
COMMENT ON COLUMN pay_user_credits.user_id IS '用户ID，关联用户表，每用户唯一';
COMMENT ON COLUMN pay_user_credits.total_credits IS '总积分数量';
COMMENT ON COLUMN pay_user_credits.used_credits IS '已使用积分数量';
COMMENT ON COLUMN pay_user_credits.available_credits IS '可用积分数量';
COMMENT ON COLUMN pay_user_credits.monthly_quota IS '月度积分配额';
COMMENT ON COLUMN pay_user_credits.quota_reset_date IS '配额重置日期';
COMMENT ON COLUMN pay_user_credits.created_at IS '创建时间';
COMMENT ON COLUMN pay_user_credits.updated_at IS '更新时间';

-- =================================
-- 5. 积分交易记录表
-- =================================
CREATE TABLE pay_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pay_credit_transactions IS '积分交易记录表';
COMMENT ON COLUMN pay_credit_transactions.id IS '积分交易记录唯一标识符';
COMMENT ON COLUMN pay_credit_transactions.user_id IS '用户ID，关联用户表';
COMMENT ON COLUMN pay_credit_transactions.transaction_type IS '交易类型：earn获得, spend消费, refund退款, expire过期';
COMMENT ON COLUMN pay_credit_transactions.amount IS '积分变动数量，正数为获得，负数为消费';
COMMENT ON COLUMN pay_credit_transactions.balance_after IS '交易后积分余额';
COMMENT ON COLUMN pay_credit_transactions.source IS '积分来源：subscription订阅, purchase购买, refund退款, usage使用';
COMMENT ON COLUMN pay_credit_transactions.source_id IS '关联的订单ID或使用记录ID';
COMMENT ON COLUMN pay_credit_transactions.description IS '交易描述说明';
COMMENT ON COLUMN pay_credit_transactions.metadata IS '额外元数据JSON格式';
COMMENT ON COLUMN pay_credit_transactions.created_at IS '创建时间';

-- =================================
-- 6. 功能使用记录表
-- =================================
CREATE TABLE pay_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    credits_consumed INTEGER NOT NULL,
    usage_data JSONB,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE pay_feature_usage IS '功能使用记录表';
COMMENT ON COLUMN pay_feature_usage.id IS '功能使用记录唯一标识符';
COMMENT ON COLUMN pay_feature_usage.user_id IS '用户ID，关联用户表';
COMMENT ON COLUMN pay_feature_usage.feature_type IS '功能类型：nano_banana图片生成, veo3_video视频生成, sticker贴纸制作';
COMMENT ON COLUMN pay_feature_usage.credits_consumed IS '消耗的积分数量';
COMMENT ON COLUMN pay_feature_usage.usage_data IS '使用详情JSON格式（图片尺寸、视频时长等）';
COMMENT ON COLUMN pay_feature_usage.status IS '使用状态：pending处理中, completed已完成, failed失败';
COMMENT ON COLUMN pay_feature_usage.created_at IS '创建时间';
COMMENT ON COLUMN pay_feature_usage.completed_at IS '完成时间';

-- =================================
-- 7. 支付订单表
-- =================================
CREATE TABLE pay_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES pay_subscription_plans(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    external_order_id VARCHAR(255),
    external_payment_id VARCHAR(255),
    payment_data JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pay_payment_orders IS '支付订单表';
COMMENT ON COLUMN pay_payment_orders.id IS '支付订单唯一标识符';
COMMENT ON COLUMN pay_payment_orders.order_no IS '订单号，系统生成唯一编号';
COMMENT ON COLUMN pay_payment_orders.user_id IS '用户ID，关联用户表';
COMMENT ON COLUMN pay_payment_orders.plan_id IS '套餐ID，关联套餐表';
COMMENT ON COLUMN pay_payment_orders.amount IS '订单金额';
COMMENT ON COLUMN pay_payment_orders.currency IS '货币类型，默认美元';
COMMENT ON COLUMN pay_payment_orders.payment_method IS '支付方式：paypal, stripe';
COMMENT ON COLUMN pay_payment_orders.payment_status IS '支付状态：pending待支付, completed已完成, failed失败, cancelled已取消, refunded已退款';
COMMENT ON COLUMN pay_payment_orders.external_order_id IS '外部支付平台订单ID';
COMMENT ON COLUMN pay_payment_orders.external_payment_id IS '外部支付平台支付ID';
COMMENT ON COLUMN pay_payment_orders.payment_data IS '支付平台返回的详细数据JSON格式';
COMMENT ON COLUMN pay_payment_orders.paid_at IS '支付完成时间';
COMMENT ON COLUMN pay_payment_orders.created_at IS '创建时间';
COMMENT ON COLUMN pay_payment_orders.updated_at IS '更新时间';

-- =================================
-- 8. 退款记录表
-- =================================
CREATE TABLE pay_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES pay_payment_orders(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT,
    refund_status VARCHAR(20) DEFAULT 'pending',
    external_refund_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pay_refunds IS '退款记录表';
COMMENT ON COLUMN pay_refunds.id IS '退款记录唯一标识符';
COMMENT ON COLUMN pay_refunds.order_id IS '原订单ID，关联支付订单表';
COMMENT ON COLUMN pay_refunds.user_id IS '用户ID，关联用户表';
COMMENT ON COLUMN pay_refunds.refund_amount IS '退款金额';
COMMENT ON COLUMN pay_refunds.refund_reason IS '退款原因说明';
COMMENT ON COLUMN pay_refunds.refund_status IS '退款状态：pending处理中, completed已完成, failed失败';
COMMENT ON COLUMN pay_refunds.external_refund_id IS '外部支付平台退款ID';
COMMENT ON COLUMN pay_refunds.processed_at IS '退款处理完成时间';
COMMENT ON COLUMN pay_refunds.created_at IS '创建时间';

-- =================================
-- 9. 索引创建
-- =================================

 

-- 订阅相关索引
CREATE INDEX idx_pay_user_subscriptions_user_id ON pay_user_subscriptions(user_id);
CREATE INDEX idx_pay_user_subscriptions_status ON pay_user_subscriptions(status);
CREATE INDEX idx_pay_user_subscriptions_end_date ON pay_user_subscriptions(end_date);

-- 积分相关索引
CREATE INDEX idx_pay_credit_transactions_user_id ON pay_credit_transactions(user_id);
CREATE INDEX idx_pay_credit_transactions_created_at ON pay_credit_transactions(created_at);
CREATE INDEX idx_pay_feature_usage_user_id ON pay_feature_usage(user_id);
CREATE INDEX idx_pay_feature_usage_created_at ON pay_feature_usage(created_at);

-- 支付相关索引
CREATE INDEX idx_pay_payment_orders_user_id ON pay_payment_orders(user_id);
CREATE INDEX idx_pay_payment_orders_status ON pay_payment_orders(payment_status);
CREATE INDEX idx_pay_payment_orders_created_at ON pay_payment_orders(created_at);

-- =================================
-- 10. 初始化数据
-- =================================

-- 初始化会员套餐数据
INSERT INTO pay_subscription_plans (plan_code, plan_name, plan_name_en, price_monthly, price_yearly, credits_monthly, features) VALUES
('starter', '入门版', 'Starter', 6.90, 69.00, 560, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple"}'),
('advanced', '进阶版', 'Advanced', 19.90, 199.00, 1680, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "normal"}'),
('professional', '专业版', 'Professional', 29.90, 299.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "high"}'),
('lifetime', '买断版', 'Lifetime', 399.00, 399.00, 4200, '{"nano_banana": true, "veo3_video": true, "sticker": true, "templates": "all", "editing_tools": "all", "ai_models": "multiple", "batch_processing": true, "professional_canvas": true, "priority_queue": "highest", "dedicated_manager": true}');

-- =================================
-- 11. 触发器和函数
-- =================================

-- 积分余额更新函数
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pay_user_credits 
    SET 
        available_credits = total_credits - used_credits,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 积分交易后自动更新余额触发器
CREATE TRIGGER trigger_update_credit_balance
    AFTER INSERT ON pay_credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_balance();

-- 检查并更新过期订阅状态函数
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
    UPDATE pay_user_subscriptions 
    SET status = 'expired'
    WHERE status = 'active' 
    AND end_date < NOW()
    AND subscription_type != 'lifetime';
END;
$$ LANGUAGE plpgsql;

-- =================================
-- 12. 权限设置 (可选)
-- =================================

-- 为应用用户创建角色
-- CREATE ROLE aiceps_app_user;

-- 授予必要权限
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aiceps_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aiceps_app_user;

-- =================================
-- 执行完成提示
-- =================================

-- 数据库结构创建完成！
-- 注意事项：
-- 1. 如果使用 Supabase，users 表由系统自动管理，无需手动创建
-- 2. 请根据实际需求调整字段长度和约束
-- 3. 建议在生产环境前进行充分测试
-- 4. 定期备份数据库
