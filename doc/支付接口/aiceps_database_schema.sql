-- AicePS 会员管理数据库结构 - 完整SQL脚本
-- 基于 Supabase 数据库系统，所有表使用 UUID 主键

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

-- 添加表注释
COMMENT ON TABLE users IS '用户表-基于Supabase认证系统';

-- 添加字段注释
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

-- 添加表注释
COMMENT ON TABLE pay_subscription_plans IS '会员套餐表';

-- 添加字段注释
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '订阅记录唯一标识符',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE COMMENT '用户ID，关联用户表',
    plan_id UUID REFERENCES pay_subscription_plans(id) COMMENT '套餐ID，关联套餐表',
    subscription_type VARCHAR(20) NOT NULL COMMENT '订阅类型：monthly月付, yearly年付, lifetime终身',
    status VARCHAR(20) DEFAULT 'active' COMMENT '订阅状态：active激活, cancelled已取消, expired已过期, pending待激活',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL COMMENT '订阅开始时间',
    end_date TIMESTAMP WITH TIME ZONE COMMENT '订阅结束时间',
    auto_renew BOOLEAN DEFAULT true COMMENT '是否自动续费',
    payment_method VARCHAR(50) COMMENT '支付方式：paypal, stripe, alipay',
    external_subscription_id VARCHAR(255) COMMENT '外部支付平台订阅ID',
    trial_end_date TIMESTAMP WITH TIME ZONE COMMENT '试用期结束时间',
    cancelled_at TIMESTAMP WITH TIME ZONE COMMENT '取消时间',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '更新时间'
) COMMENT '用户订阅表';

-- =================================
-- 4. 积分账户表
-- =================================
CREATE TABLE pay_user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '积分账户唯一标识符',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE COMMENT '用户ID，关联用户表，每用户唯一',
    total_credits INTEGER DEFAULT 0 COMMENT '总积分数量',
    used_credits INTEGER DEFAULT 0 COMMENT '已使用积分数量',
    available_credits INTEGER DEFAULT 0 COMMENT '可用积分数量',
    monthly_quota INTEGER DEFAULT 0 COMMENT '月度积分配额',
    quota_reset_date TIMESTAMP WITH TIME ZONE COMMENT '配额重置日期',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '更新时间'
) COMMENT '积分账户表';

-- =================================
-- 5. 积分交易记录表
-- =================================
CREATE TABLE pay_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '积分交易记录唯一标识符',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE COMMENT '用户ID，关联用户表',
    transaction_type VARCHAR(20) NOT NULL COMMENT '交易类型：earn获得, spend消费, refund退款, expire过期',
    amount INTEGER NOT NULL COMMENT '积分变动数量，正数为获得，负数为消费',
    balance_after INTEGER NOT NULL COMMENT '交易后积分余额',
    source VARCHAR(50) NOT NULL COMMENT '积分来源：subscription订阅, purchase购买, refund退款, usage使用',
    source_id VARCHAR(255) COMMENT '关联的订单ID或使用记录ID',
    description TEXT COMMENT '交易描述说明',
    metadata JSONB DEFAULT '{}' COMMENT '额外元数据JSON格式',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间'
) COMMENT '积分交易记录表';

-- =================================
-- 6. 功能使用记录表
-- =================================
CREATE TABLE pay_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '功能使用记录唯一标识符',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE COMMENT '用户ID，关联用户表',
    feature_type VARCHAR(50) NOT NULL COMMENT '功能类型：nano_banana图片生成, veo3_video视频生成, sticker贴纸制作',
    credits_consumed INTEGER NOT NULL COMMENT '消耗的积分数量',
    usage_data JSONB COMMENT '使用详情JSON格式（图片尺寸、视频时长等）',
    status VARCHAR(20) DEFAULT 'completed' COMMENT '使用状态：pending处理中, completed已完成, failed失败',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间',
    completed_at TIMESTAMP WITH TIME ZONE COMMENT '完成时间'
) COMMENT '功能使用记录表';

-- =================================
-- 7. 支付订单表
-- =================================
CREATE TABLE pay_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '支付订单唯一标识符',
    order_no VARCHAR(100) UNIQUE NOT NULL COMMENT '订单号，系统生成唯一编号',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE COMMENT '用户ID，关联用户表',
    plan_id UUID REFERENCES pay_subscription_plans(id) COMMENT '套餐ID，关联套餐表',
    amount DECIMAL(10,2) NOT NULL COMMENT '订单金额',
    currency VARCHAR(3) DEFAULT 'USD' COMMENT '货币类型，默认美元',
    payment_method VARCHAR(50) NOT NULL COMMENT '支付方式：paypal, stripe',
    payment_status VARCHAR(20) DEFAULT 'pending' COMMENT '支付状态：pending待支付, completed已完成, failed失败, cancelled已取消, refunded已退款',
    external_order_id VARCHAR(255) COMMENT '外部支付平台订单ID',
    external_payment_id VARCHAR(255) COMMENT '外部支付平台支付ID',
    payment_data JSONB COMMENT '支付平台返回的详细数据JSON格式',
    paid_at TIMESTAMP WITH TIME ZONE COMMENT '支付完成时间',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '更新时间'
) COMMENT '支付订单表';

-- =================================
-- 8. 退款记录表
-- =================================
CREATE TABLE pay_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() COMMENT '退款记录唯一标识符',
    order_id UUID REFERENCES pay_payment_orders(id) COMMENT '原订单ID，关联支付订单表',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE COMMENT '用户ID，关联用户表',
    refund_amount DECIMAL(10,2) NOT NULL COMMENT '退款金额',
    refund_reason TEXT COMMENT '退款原因说明',
    refund_status VARCHAR(20) DEFAULT 'pending' COMMENT '退款状态：pending处理中, completed已完成, failed失败',
    external_refund_id VARCHAR(255) COMMENT '外部支付平台退款ID',
    processed_at TIMESTAMP WITH TIME ZONE COMMENT '退款处理完成时间',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() COMMENT '创建时间'
) COMMENT '退款记录表';

-- =================================
-- 9. 索引创建
-- =================================

-- 用户相关索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

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
