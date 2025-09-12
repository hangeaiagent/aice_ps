-- 清理并重建nb_user_profiles表
-- 如果遇到约束问题，使用此脚本完全重建表

-- 1. 备份现有数据（如果表存在且有数据）
DROP TABLE IF EXISTS nb_user_profiles_backup;
CREATE TABLE nb_user_profiles_backup AS 
SELECT * FROM nb_user_profiles 
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'nb_user_profiles'
);

-- 2. 删除现有表
DROP TABLE IF EXISTS nb_user_profiles CASCADE;

-- 3. 重新创建表（带正确的约束）
CREATE TABLE nb_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_creator BOOLEAN DEFAULT false,
    creator_level INTEGER DEFAULT 1, -- 1:新手, 2:进阶, 3:专家, 4:大师
    total_templates INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 恢复数据（如果备份表存在）
INSERT INTO nb_user_profiles (user_id, username, avatar_url, bio, is_creator, creator_level, total_templates, total_downloads, total_likes, reputation_score, created_at, updated_at)
SELECT DISTINCT ON (user_id) user_id, username, avatar_url, bio, is_creator, creator_level, total_templates, total_downloads, total_likes, reputation_score, created_at, updated_at
FROM nb_user_profiles_backup
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nb_user_profiles_backup')
ON CONFLICT (user_id) DO NOTHING;

-- 5. 创建系统用户档案
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'System', true, 4)
ON CONFLICT (user_id) DO NOTHING;

-- 6. 验证结果（使用SELECT代替RAISE）
SELECT 
    '重建验证' as operation,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN username = 'System' THEN 1 END) as system_user_count,
    CASE 
        WHEN COUNT(CASE WHEN username = 'System' THEN 1 END) > 0 
        THEN '✅ 系统用户创建成功' 
        ELSE '❌ 系统用户创建失败' 
    END as status
FROM nb_user_profiles;
