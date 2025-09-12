-- 简单版本：创建系统用户档案（避免ON CONFLICT语法）
-- User UID: e1b114bd-fe81-4822-b1f2-de28abded7d9

-- 1. 确保表存在
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

-- 2. 删除可能存在的系统用户（避免冲突）
DELETE FROM nb_user_profiles 
WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID;

-- 3. 创建系统用户档案
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
VALUES ('e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID, 'System', true, 4);

-- 4. 验证结果
SELECT 
    '系统用户创建完成' as status,
    user_id,
    username,
    is_creator,
    creator_level,
    created_at
FROM nb_user_profiles 
WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID;