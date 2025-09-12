-- 使用指定的用户ID创建系统用户档案
-- User UID: e1b114bd-fe81-4822-b1f2-de28abded7d9

-- 1. 确保nb_user_profiles表存在并有正确的约束
CREATE TABLE IF NOT EXISTS nb_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_creator BOOLEAN DEFAULT false,
    creator_level INTEGER DEFAULT 1,
    total_templates INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建系统用户档案（使用DO块处理冲突）
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- 检查用户是否已存在
    SELECT EXISTS(
        SELECT 1 FROM nb_user_profiles 
        WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
        VALUES ('e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID, 'System', true, 4);
        RAISE NOTICE '✅ 系统用户档案创建成功';
    ELSE
        -- 更新现有用户
        UPDATE nb_user_profiles 
        SET username = 'System',
            is_creator = true,
            creator_level = 4,
            updated_at = NOW()
        WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID;
        RAISE NOTICE '✅ 系统用户档案已更新';
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE '❌ 外键约束错误: 用户ID在auth.users表中不存在';
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 创建系统用户时发生错误: %', SQLERRM;
END $$;

-- 3. 验证系统用户创建结果
SELECT 
    'System User Profile' as status,
    user_id,
    username,
    is_creator,
    creator_level,
    created_at,
    updated_at
FROM nb_user_profiles 
WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID;
