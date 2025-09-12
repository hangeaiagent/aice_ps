-- 使用现有用户作为系统用户的解决方案

-- 1. 查找现有用户
SELECT 
    'Available Users' as info,
    id as user_id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at 
LIMIT 5;

-- 2. 使用第一个现有用户创建系统档案
-- 注意：请将下面的UUID替换为上面查询结果中的实际用户ID
INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
SELECT 
    id,
    'System',
    true,
    4
FROM auth.users 
ORDER BY created_at 
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 3. 验证结果
SELECT 
    'System Profile Created' as status,
    p.user_id,
    p.username,
    u.email as user_email,
    p.is_creator,
    p.creator_level
FROM nb_user_profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.username = 'System';

-- 4. 更新模板数据使用实际的用户ID
UPDATE nb_templates 
SET author_id = (
    SELECT user_id 
    FROM nb_user_profiles 
    WHERE username = 'System' 
    LIMIT 1
)
WHERE author_id = '00000000-0000-0000-0000-000000000001';
