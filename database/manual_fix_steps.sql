-- 手动修复步骤 - 逐步执行
-- 请按顺序逐个执行以下SQL语句

-- 第1步: 删除现有的nb_user_profiles表（如果存在）
DROP TABLE IF EXISTS nb_user_profiles CASCADE;

-- 第2步: 创建新的nb_user_profiles表（带唯一约束）
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

-- 第3步: 插入系统用户
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
VALUES ('e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID, 'System', true, 4);

-- 第4步: 验证结果
SELECT * FROM nb_user_profiles WHERE username = 'System';
