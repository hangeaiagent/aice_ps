-- 更新PayPal计划ID
-- 这些是示例PayPal计划ID，您需要在PayPal Dashboard创建真实的订阅计划并替换这些ID

-- 更新入门版套餐的PayPal计划ID
UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-5ML4271244454362WXNWU5NQ'
WHERE plan_code = 'starter';

-- 更新专业版套餐的PayPal计划ID
UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-1GJ4878431315332BXNWU5OQ'
WHERE plan_code = 'pro';

-- 更新企业版套餐的PayPal计划ID
UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-8HT4271244454362CXNWU5PQ'
WHERE plan_code = 'enterprise';

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
