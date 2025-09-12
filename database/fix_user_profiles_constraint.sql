-- 修复nb_user_profiles表的唯一约束
-- 如果表已经存在但没有user_id的唯一约束，使用此脚本修复

-- 1. 检查并添加唯一约束
DO $$
DECLARE
    constraint_exists BOOLEAN;
    system_user_id UUID := '00000000-0000-0000-0000-000000000001';
    profile_exists BOOLEAN;
BEGIN
    -- 检查唯一约束是否已存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nb_user_profiles_user_id_key' 
        AND table_name = 'nb_user_profiles'
        AND constraint_type = 'UNIQUE'
    ) INTO constraint_exists;
    
    -- 如果约束不存在，则添加
    IF NOT constraint_exists THEN
        -- 先检查是否有重复的user_id数据
        IF EXISTS (
            SELECT user_id FROM nb_user_profiles 
            GROUP BY user_id 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION '表中存在重复的user_id，无法添加唯一约束。请先清理重复数据。';
        END IF;
        
        -- 添加唯一约束
        ALTER TABLE nb_user_profiles ADD CONSTRAINT nb_user_profiles_user_id_key UNIQUE (user_id);
        RAISE NOTICE '✅ 已添加user_id唯一约束';
    ELSE
        RAISE NOTICE '✅ user_id唯一约束已存在';
    END IF;
    
    -- 2. 创建系统用户档案
    SELECT EXISTS(
        SELECT 1 FROM nb_user_profiles WHERE user_id = system_user_id
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
        VALUES (system_user_id, 'System', true, 4);
        RAISE NOTICE '✅ 已创建系统用户档案';
    ELSE
        RAISE NOTICE '✅ 系统用户档案已存在，跳过创建';
    END IF;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE '⚠️  系统用户档案已存在（唯一约束冲突），跳过创建';
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 执行过程中发生错误: %', SQLERRM;
        RAISE;
END $$;
