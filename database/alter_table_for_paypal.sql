-- 修改 pay_subscription_plans 表结构以支持 PayPal 计划 ID
-- 重要：此操作会删除现有数据，请先备份

-- 1. 备份现有数据（如果需要）
-- CREATE TABLE pay_subscription_plans_backup AS SELECT * FROM pay_subscription_plans;

-- 2. 删除依赖此表的外键约束
ALTER TABLE pay_user_subscriptions 
DROP CONSTRAINT IF EXISTS pay_user_subscriptions_plan_id_fkey;

-- 3. 删除原表
DROP TABLE IF EXISTS pay_subscription_plans CASCADE;

-- 4. 重新创建表，使用 VARCHAR 作为主键类型（存储 PayPal 计划 ID）
CREATE TABLE pay_subscription_plans (
    id VARCHAR(50) PRIMARY KEY,  -- PayPal 计划 ID (格式: P-XXXXXXXXXXXXX)
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    features TEXT[],
    max_credits INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 添加表注释
COMMENT ON TABLE pay_subscription_plans IS '订阅套餐表';
COMMENT ON COLUMN pay_subscription_plans.id IS 'PayPal计划ID，作为主键';
COMMENT ON COLUMN pay_subscription_plans.plan_code IS '套餐代码（starter/pro/enterprise）';
COMMENT ON COLUMN pay_subscription_plans.plan_name IS '套餐名称';
COMMENT ON COLUMN pay_subscription_plans.monthly_price IS '月费价格';
COMMENT ON COLUMN pay_subscription_plans.features IS '功能特性列表';
COMMENT ON COLUMN pay_subscription_plans.max_credits IS '每月最大积分数，-1表示无限';
COMMENT ON COLUMN pay_subscription_plans.sort_order IS '排序顺序';
COMMENT ON COLUMN pay_subscription_plans.is_active IS '是否激活';

-- 6. 修改 pay_user_subscriptions 表的 plan_id 字段类型
ALTER TABLE pay_user_subscriptions 
ALTER COLUMN plan_id TYPE VARCHAR(50);

-- 7. 重新添加外键约束
ALTER TABLE pay_user_subscriptions 
ADD CONSTRAINT pay_user_subscriptions_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES pay_subscription_plans(id);

-- 8. 插入示例数据（使用真实的 PayPal 计划 ID）
-- 注意：请替换为您在 PayPal Dashboard 创建的真实计划 ID
INSERT INTO pay_subscription_plans (
    id,  -- PayPal 计划 ID
    plan_code, 
    plan_name, 
    monthly_price, 
    features, 
    max_credits, 
    sort_order,
    is_active
) VALUES 
(
    'P-5ML4271244454362WXNWU5NQ',  -- 替换为您的 PayPal 入门版计划 ID
    'starter',
    '入门版',
    9.99,
    ARRAY['每月100张图片', '基础编辑功能', '标准客服支持'],
    100,
    1,
    true
),
(
    'P-1GJ4878431315332BXNWU5OQ',  -- 替换为您的 PayPal 专业版计划 ID
    'pro',
    '专业版',
    19.99,
    ARRAY['每月500张图片', '高级编辑功能', '优先客服支持', 'API访问'],
    500,
    2,
    true
),
(
    'P-8HT4271244454362CXNWU5PQ',  -- 替换为您的 PayPal 企业版计划 ID
    'enterprise',
    '企业版',
    49.99,
    ARRAY['无限图片处理', '全部功能', '专属客服', 'API访问', '自定义集成'],
    -1,
    3,
    true
);

-- 9. 验证数据
SELECT 
    id as paypal_plan_id,
    plan_code,
    plan_name,
    monthly_price,
    features,
    max_credits,
    is_active
FROM pay_subscription_plans
ORDER BY sort_order;
