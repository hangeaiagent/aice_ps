-- 重要说明：pay_subscription_plans 表的 id 字段直接作为 PayPal 计划 ID
-- 因此需要在插入数据时，将 id 设置为从 PayPal Dashboard 获取的计划 ID

-- 方法1：如果表中已有数据，需要删除并重新插入
DELETE FROM pay_subscription_plans WHERE plan_code IN ('starter', 'pro', 'enterprise');

-- 方法2：插入新数据时，直接指定 id 为 PayPal 计划 ID
-- 注意：需要先在 PayPal Dashboard 创建订阅计划，获取计划 ID

-- 插入入门版套餐（使用 PayPal 计划 ID 作为主键）
INSERT INTO pay_subscription_plans (
    id,  -- 这是 PayPal 计划 ID
    plan_code, 
    plan_name, 
    monthly_price, 
    features, 
    max_credits, 
    sort_order,
    is_active
) VALUES (
    'P-5ML4271244454362WXNWU5NQ',  -- 替换为您的 PayPal 计划 ID
    'starter',
    '入门版',
    9.99,
    ARRAY['每月100张图片', '基础编辑功能', '标准客服支持'],
    100,
    1,
    true
);

-- 插入专业版套餐
INSERT INTO pay_subscription_plans (
    id,
    plan_code,
    plan_name,
    monthly_price,
    features,
    max_credits,
    sort_order,
    is_active
) VALUES (
    'P-1GJ4878431315332BXNWU5OQ',  -- 替换为您的 PayPal 计划 ID
    'pro',
    '专业版',
    19.99,
    ARRAY['每月500张图片', '高级编辑功能', '优先客服支持', 'API访问'],
    500,
    2,
    true
);

-- 插入企业版套餐
INSERT INTO pay_subscription_plans (
    id,
    plan_code,
    plan_name,
    monthly_price,
    features,
    max_credits,
    sort_order,
    is_active
) VALUES (
    'P-8HT4271244454362CXNWU5PQ',  -- 替换为您的 PayPal 计划 ID
    'enterprise',
    '企业版',
    49.99,
    ARRAY['无限图片处理', '全部功能', '专属客服', 'API访问', '自定义集成'],
    -1,
    3,
    true
);

-- 验证更新结果
SELECT 
    plan_code,
    plan_name,
    monthly_price,
    paypal_plan_id,
    is_active
FROM pay_subscription_plans
ORDER BY sort_order;

-- 注意：
-- 1. 以上PayPal计划ID是示例，需要在PayPal Dashboard创建真实的订阅计划
-- 2. 创建PayPal订阅计划的步骤：
--    a. 登录PayPal Developer Dashboard
--    b. 进入"Products & Plans"
--    c. 创建产品（Product）
--    d. 为每个套餐创建计划（Plan）
--    e. 记录每个计划的ID
-- 3. 确保PayPal计划的价格与数据库中的价格一致
