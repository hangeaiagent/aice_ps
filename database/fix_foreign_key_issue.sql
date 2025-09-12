-- 修复外键约束问题
-- 系统用户ID在auth.users表中不存在的解决方案

-- 方案1: 创建系统用户（如果可以访问auth.users表）
-- 注意：这通常需要在Supabase控制台的Authentication页面手动创建

-- 方案2: 使用现有用户或移除外键约束
DO $$
DECLARE
    existing_user_id UUID;
    system_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 检查系统用户是否存在于auth.users表
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE id = system_user_id 
    LIMIT 1;
    
    IF existing_user_id IS NULL THEN
        -- 系统用户不存在，尝试获取第一个现有用户
        SELECT id INTO existing_user_id 
        FROM auth.users 
        ORDER BY created_at 
        LIMIT 1;
        
        IF existing_user_id IS NOT NULL THEN
            -- 使用现有用户ID
            RAISE NOTICE '系统用户不存在，使用现有用户ID: %', existing_user_id;
            system_user_id := existing_user_id;
        ELSE
            -- 没有任何用户，临时移除外键约束
            RAISE NOTICE '没有找到任何用户，将临时移除外键约束';
            ALTER TABLE nb_user_profiles DROP CONSTRAINT IF EXISTS nb_user_profiles_user_id_fkey;
        END IF;
    ELSE
        RAISE NOTICE '系统用户已存在: %', existing_user_id;
    END IF;
    
    -- 创建系统用户档案
    INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
    VALUES (system_user_id, 'System', true, 4)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '系统用户档案创建完成，用户ID: %', system_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '创建过程中发生错误: %', SQLERRM;
END $$;
