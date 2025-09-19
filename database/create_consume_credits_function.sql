-- 创建消费用户积分的数据库函数
-- 该函数用于在用户使用功能时扣除积分

-- 如果函数已存在，先删除
DROP FUNCTION IF EXISTS public.consume_user_credits(UUID, INTEGER);

-- 创建消费积分函数
CREATE OR REPLACE FUNCTION public.consume_user_credits(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_credits INTEGER;
    v_available_credits INTEGER;
    v_result JSON;
BEGIN
    -- 检查用户积分记录是否存在
    SELECT available_credits INTO v_available_credits
    FROM pay_user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- 如果用户没有积分记录，创建一个默认记录
    IF NOT FOUND THEN
        -- 为新用户创建默认积分记录（免费用户10个积分）
        INSERT INTO pay_user_credits (
            user_id,
            total_credits,
            used_credits,
            available_credits,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            10,  -- 默认总积分
            0,   -- 已使用积分
            10,  -- 可用积分
            NOW(),
            NOW()
        );
        
        v_available_credits := 10;
    END IF;
    
    -- 检查积分是否足够
    IF v_available_credits < p_amount THEN
        -- 积分不足
        v_result := json_build_object(
            'success', false,
            'error', 'insufficient_credits',
            'message', format('积分不足，需要 %s 积分，当前剩余 %s 积分', p_amount, v_available_credits),
            'available_credits', v_available_credits,
            'required_credits', p_amount
        );
        RETURN v_result;
    END IF;
    
    -- 扣除积分
    UPDATE pay_user_credits
    SET 
        used_credits = used_credits + p_amount,
        available_credits = available_credits - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 记录积分消费历史
    INSERT INTO pay_credit_transactions (
        id,
        user_id,
        type,
        amount,
        balance_after,
        description,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        'debit',
        p_amount,
        v_available_credits - p_amount,
        '功能使用消费',
        NOW()
    );
    
    -- 返回成功结果
    v_result := json_build_object(
        'success', true,
        'credits_consumed', p_amount,
        'remaining_credits', v_available_credits - p_amount,
        'message', format('成功消费 %s 积分', p_amount)
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- 处理任何错误
        v_result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', '消费积分时发生错误'
        );
        RETURN v_result;
END;
$$;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION public.consume_user_credits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_credits(UUID, INTEGER) TO service_role;

-- 添加函数注释
COMMENT ON FUNCTION public.consume_user_credits(UUID, INTEGER) IS '消费用户积分函数，用于扣除用户使用功能时的积分';

-- 创建积分交易记录表（如果不存在）
CREATE TABLE IF NOT EXISTS pay_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'refund')), -- 交易类型
    amount INTEGER NOT NULL, -- 交易金额
    balance_after INTEGER NOT NULL, -- 交易后余额
    description TEXT, -- 交易描述
    related_order_id UUID, -- 关联订单ID（可选）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为交易记录表创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON pay_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON pay_credit_transactions(created_at DESC);

-- 添加表注释
COMMENT ON TABLE pay_credit_transactions IS '用户积分交易记录表';
COMMENT ON COLUMN pay_credit_transactions.type IS '交易类型: credit(充值), debit(消费), refund(退款)';
COMMENT ON COLUMN pay_credit_transactions.amount IS '交易金额（积分数量）';
COMMENT ON COLUMN pay_credit_transactions.balance_after IS '交易后的积分余额';

-- 创建获取用户积分余额的辅助函数
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    SELECT available_credits INTO v_credits
    FROM pay_user_credits
    WHERE user_id = p_user_id;
    
    -- 如果没有记录，返回默认值
    IF NOT FOUND THEN
        RETURN 10; -- 免费用户默认10个积分
    END IF;
    
    RETURN COALESCE(v_credits, 0);
END;
$$;

-- 授予获取积分函数的执行权限
GRANT EXECUTE ON FUNCTION public.get_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credits(UUID) TO service_role;

-- 添加函数注释
COMMENT ON FUNCTION public.get_user_credits(UUID) IS '获取用户当前可用积分数量';

-- 创建充值积分函数
CREATE OR REPLACE FUNCTION public.add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT '积分充值'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_credits INTEGER;
    v_result JSON;
BEGIN
    -- 获取或创建用户积分记录
    INSERT INTO pay_user_credits (
        user_id,
        total_credits,
        used_credits,
        available_credits,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_amount,
        0,
        p_amount,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        total_credits = pay_user_credits.total_credits + p_amount,
        available_credits = pay_user_credits.available_credits + p_amount,
        updated_at = NOW()
    RETURNING available_credits INTO v_current_credits;
    
    -- 记录充值交易
    INSERT INTO pay_credit_transactions (
        user_id,
        type,
        amount,
        balance_after,
        description,
        created_at
    ) VALUES (
        p_user_id,
        'credit',
        p_amount,
        v_current_credits,
        p_description,
        NOW()
    );
    
    -- 返回结果
    v_result := json_build_object(
        'success', true,
        'credits_added', p_amount,
        'total_credits', v_current_credits,
        'message', format('成功充值 %s 积分', p_amount)
    );
    
    RETURN v_result;
END;
$$;

-- 授予充值函数的执行权限
GRANT EXECUTE ON FUNCTION public.add_user_credits(UUID, INTEGER, TEXT) TO service_role;

-- 添加函数注释
COMMENT ON FUNCTION public.add_user_credits(UUID, INTEGER, TEXT) IS '为用户充值积分';

-- 测试函数是否创建成功
DO $$
BEGIN
    RAISE NOTICE '✅ 积分管理函数创建成功！';
    RAISE NOTICE '  - consume_user_credits: 消费积分';
    RAISE NOTICE '  - get_user_credits: 获取积分余额';
    RAISE NOTICE '  - add_user_credits: 充值积分';
END $$;
