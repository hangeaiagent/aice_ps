-- 简化版重建nb_user_profiles表
-- 移除所有RAISE语句，避免语法错误

-- 1. 备份现有数据（如果需要）
DROP TABLE IF EXISTS nb_user_profiles_backup;
CREATE TABLE nb_user_profiles_backup AS 
SELECT * FROM nb_user_profiles WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'nb_user_profiles'
);

-- 2. 删除现有表
DROP TABLE IF EXISTS nb_user_profiles CASCADE;

-- 3. 重新创建表（带正确的约束）
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

-- 4. 恢复数据（如果备份表有数据）
INSERT INTO nb_user_profiles (user_id, username, avatar_url, bio, is_creator, creator_level, total_templates, total_downloads, total_likes, reputation_score, created_at, updated_at)
SELECT DISTINCT ON (user_id) user_id, username, avatar_url, bio, is_creator, creator_level, total_templates, total_downloads, total_likes, reputation_score, created_at, updated_at
FROM nb_user_profiles_backup
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nb_user_profiles_backup')
ON CONFLICT (user_id) DO NOTHING;

-- 5. 创建系统用户档案
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
VALUES ('e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID, 'System', true, 4)
ON CONFLICT (user_id) DO NOTHING;

-- 6. 验证结果（使用SELECT语句代替RAISE）
SELECT 
    '重建完成' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN username = 'System' THEN 1 END) as system_user_count,
    CASE 
        WHEN COUNT(CASE WHEN username = 'System' THEN 1 END) > 0 
        THEN '系统用户创建成功' 
        ELSE '系统用户创建失败' 
    END as system_user_status
FROM nb_user_profiles;
