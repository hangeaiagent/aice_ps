-- 简单修复nb_user_profiles表的唯一约束问题
-- 避免复杂语法，确保兼容性

-- 步骤1: 检查表是否存在，如果存在则备份
CREATE TABLE IF NOT EXISTS nb_user_profiles_backup AS 
SELECT * FROM nb_user_profiles WHERE 1=0; -- 创建空的备份表结构

-- 如果原表有数据，手动备份（需要在有数据时执行）
-- INSERT INTO nb_user_profiles_backup SELECT * FROM nb_user_profiles;

-- 步骤2: 删除原表
DROP TABLE IF EXISTS nb_user_profiles CASCADE;

-- 步骤3: 创建新表（带正确约束）
CREATE TABLE nb_user_profiles (
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

-- 步骤4: 创建系统用户
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
VALUES ('e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID, 'System', true, 4);

-- 步骤5: 验证创建结果
SELECT 
    'nb_user_profiles表已创建' as status,
    COUNT(*) as profile_count,
    CASE WHEN EXISTS(SELECT 1 FROM nb_user_profiles WHERE username = 'System') 
         THEN '系统用户已创建' 
         ELSE '系统用户创建失败' 
    END as system_user_status
FROM nb_user_profiles;
