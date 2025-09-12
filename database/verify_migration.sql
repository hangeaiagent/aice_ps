-- 验证数据库迁移是否成功
-- 执行此脚本检查所有表和数据是否正确创建

DO $$
DECLARE
    table_count INTEGER;
    template_count INTEGER;
    category_count INTEGER;
    tag_count INTEGER;
    system_user_exists BOOLEAN;
    constraint_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 开始验证数据库迁移...';
    RAISE NOTICE '';
    
    -- 1. 检查表是否存在
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN (
        'nb_user_profiles', 'nb_template_categories', 'nb_template_tags', 
        'nb_templates', 'nb_template_tag_relations', 'nb_user_favorites',
        'nb_user_likes', 'nb_user_ratings', 'nb_user_comments', 'nb_template_usage_logs'
    );
    
    RAISE NOTICE '📋 表结构检查：';
    RAISE NOTICE '   - 应创建表数量: 10';
    RAISE NOTICE '   - 实际创建表数量: %', table_count;
    
    IF table_count = 10 THEN
        RAISE NOTICE '   ✅ 所有表已正确创建';
    ELSE
        RAISE NOTICE '   ❌ 表创建不完整';
    END IF;
    
    -- 2. 检查唯一约束
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nb_user_profiles_user_id_key' 
        AND table_name = 'nb_user_profiles'
        AND constraint_type = 'UNIQUE'
    ) INTO constraint_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 约束检查：';
    IF constraint_exists THEN
        RAISE NOTICE '   ✅ nb_user_profiles.user_id 唯一约束存在';
    ELSE
        RAISE NOTICE '   ❌ nb_user_profiles.user_id 唯一约束缺失';
    END IF;
    
    -- 3. 检查数据
    SELECT COUNT(*) INTO template_count FROM nb_templates;
    SELECT COUNT(*) INTO category_count FROM nb_template_categories;
    SELECT COUNT(*) INTO tag_count FROM nb_template_tags;
    SELECT EXISTS(SELECT 1 FROM nb_user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001') INTO system_user_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 数据检查：';
    RAISE NOTICE '   - 模板数量: % (期望: 4)', template_count;
    RAISE NOTICE '   - 分类数量: % (期望: 4)', category_count;
    RAISE NOTICE '   - 标签数量: % (期望: 8)', tag_count;
    RAISE NOTICE '   - 系统用户: %', CASE WHEN system_user_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
    
    -- 4. 检查模板详情
    IF template_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '📝 模板详情：';
        FOR rec IN 
            SELECT title, category.name as category_name, view_count, like_count
            FROM nb_templates t
            LEFT JOIN nb_template_categories category ON t.category_id = category.id
            ORDER BY t.created_at
        LOOP
            RAISE NOTICE '   - %: 分类[%], 浏览[%], 点赞[%]', 
                rec.title, rec.category_name, rec.view_count, rec.like_count;
        END LOOP;
    END IF;
    
    -- 5. 检查标签关联
    RAISE NOTICE '';
    RAISE NOTICE '🏷️  标签关联检查：';
    FOR rec IN 
        SELECT t.title, string_agg(tag.name, ', ') as tags
        FROM nb_templates t
        LEFT JOIN nb_template_tag_relations tr ON t.id = tr.template_id
        LEFT JOIN nb_template_tags tag ON tr.tag_id = tag.id
        GROUP BY t.id, t.title
        ORDER BY t.title
    LOOP
        RAISE NOTICE '   - %: [%]', rec.title, COALESCE(rec.tags, '无标签');
    END LOOP;
    
    -- 6. 总结
    RAISE NOTICE '';
    RAISE NOTICE '📋 迁移验证总结：';
    
    IF table_count = 10 AND constraint_exists AND template_count = 4 AND 
       category_count = 4 AND tag_count = 8 AND system_user_exists THEN
        RAISE NOTICE '🎉 数据库迁移完全成功！';
        RAISE NOTICE '   - 所有表结构正确';
        RAISE NOTICE '   - 所有约束正确';
        RAISE NOTICE '   - 所有数据完整';
        RAISE NOTICE '   - 可以开始使用新的模板系统';
    ELSE
        RAISE NOTICE '⚠️  迁移存在问题，请检查上述错误项';
    END IF;
    
END $$;
