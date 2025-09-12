-- 简化版验证脚本 - 使用SELECT代替RAISE语句

-- 1. 检查表是否存在
SELECT 
    '表结构检查' as check_type,
    COUNT(*) as existing_tables,
    CASE WHEN COUNT(*) = 10 THEN '✅ 所有表已创建' ELSE '❌ 表创建不完整' END as status
FROM information_schema.tables 
WHERE table_name IN (
    'nb_user_profiles', 'nb_template_categories', 'nb_template_tags', 
    'nb_templates', 'nb_template_tag_relations', 'nb_user_favorites',
    'nb_user_likes', 'nb_user_ratings', 'nb_user_comments', 'nb_template_usage_logs'
);

-- 2. 检查唯一约束
SELECT 
    '约束检查' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nb_user_profiles_user_id_key' 
        AND table_name = 'nb_user_profiles'
        AND constraint_type = 'UNIQUE'
    ) THEN '✅ 唯一约束存在' ELSE '❌ 唯一约束缺失' END as status;

-- 3. 检查数据完整性
SELECT 
    '数据检查' as check_type,
    (SELECT COUNT(*) FROM nb_templates) as template_count,
    (SELECT COUNT(*) FROM nb_template_categories) as category_count,
    (SELECT COUNT(*) FROM nb_template_tags) as tag_count,
    CASE WHEN EXISTS(SELECT 1 FROM nb_user_profiles WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9') 
         THEN '✅ 系统用户存在' 
         ELSE '❌ 系统用户不存在' 
    END as system_user_status;

-- 4. 检查模板详情
SELECT 
    '模板详情' as check_type,
    t.title,
    c.name as category_name,
    t.view_count,
    t.like_count
FROM nb_templates t
LEFT JOIN nb_template_categories c ON t.category_id = c.id
ORDER BY t.created_at;

-- 5. 检查标签关联
SELECT 
    '标签关联' as check_type,
    t.title,
    string_agg(tag.name, ', ') as tags
FROM nb_templates t
LEFT JOIN nb_template_tag_relations tr ON t.id = tr.template_id
LEFT JOIN nb_template_tags tag ON tr.tag_id = tag.id
GROUP BY t.id, t.title
ORDER BY t.title;

-- 6. 总体状态检查
SELECT 
    '迁移总结' as check_type,
    CASE WHEN 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (
            'nb_user_profiles', 'nb_template_categories', 'nb_template_tags', 
            'nb_templates', 'nb_template_tag_relations', 'nb_user_favorites',
            'nb_user_likes', 'nb_user_ratings', 'nb_user_comments', 'nb_template_usage_logs'
        )) = 10
        AND EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'nb_user_profiles_user_id_key' 
            AND table_name = 'nb_user_profiles'
        )
        AND (SELECT COUNT(*) FROM nb_templates) = 4
        AND (SELECT COUNT(*) FROM nb_template_categories) = 4
        AND (SELECT COUNT(*) FROM nb_template_tags) = 8
        AND EXISTS(SELECT 1 FROM nb_user_profiles WHERE user_id = 'e1b114bd-fe81-4822-b1f2-de28abded7d9')
    THEN '🎉 数据库迁移完全成功！'
    ELSE '⚠️ 迁移存在问题，请检查上述项目'
    END as final_status;
