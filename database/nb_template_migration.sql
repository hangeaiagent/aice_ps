-- NB提示词模板库 - 数据库迁移脚本
-- 创建表结构并迁移现有数据

-- ================================
-- 1. 创建基础表结构
-- ================================

-- 用户扩展信息表
CREATE TABLE IF NOT EXISTS nb_user_profiles (
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

-- 模板分类表
CREATE TABLE IF NOT EXISTS nb_template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    icon_url TEXT,
    parent_id UUID REFERENCES nb_template_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板标签表
CREATE TABLE IF NOT EXISTS nb_template_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- 标签颜色
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板主表
CREATE TABLE IF NOT EXISTS nb_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    
    -- 作者信息
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 分类信息
    category_id UUID REFERENCES nb_template_categories(id),
    
    -- 媒体资源
    cover_image_url TEXT,
    example_images TEXT[], -- 示例图片数组
    
    -- 模板属性
    difficulty_level INTEGER DEFAULT 1, -- 1:简单, 2:中等, 3:困难
    estimated_time INTEGER, -- 预估使用时间(分钟)
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'published', -- draft, pending, published, rejected, archived
    is_featured BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    
    -- 统计数据
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    
    -- 版本控制
    version VARCHAR(10) DEFAULT '1.0',
    parent_template_id UUID REFERENCES nb_templates(id), -- 用于版本管理
    
    -- 审核信息
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板标签关联表
CREATE TABLE IF NOT EXISTS nb_template_tag_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES nb_template_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, tag_id)
);

-- 用户收藏表
CREATE TABLE IF NOT EXISTS nb_user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_id)
);

-- 用户点赞表
CREATE TABLE IF NOT EXISTS nb_user_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_id)
);

-- 用户评分表
CREATE TABLE IF NOT EXISTS nb_user_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_id)
);

-- 用户评论表
CREATE TABLE IF NOT EXISTS nb_user_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES nb_user_comments(id), -- 支持回复
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板使用记录表
CREATE TABLE IF NOT EXISTS nb_template_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nb_templates(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- view, download, use, share
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 2. 创建索引
-- ================================

-- 性能优化索引
CREATE INDEX IF NOT EXISTS idx_nb_templates_author_id ON nb_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_nb_templates_category_id ON nb_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_nb_templates_status ON nb_templates(status);
CREATE INDEX IF NOT EXISTS idx_nb_templates_created_at ON nb_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nb_templates_download_count ON nb_templates(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_nb_templates_like_count ON nb_templates(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_nb_templates_rating_avg ON nb_templates(rating_avg DESC);

-- 搜索优化索引
CREATE INDEX IF NOT EXISTS idx_nb_templates_title_search ON nb_templates USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_nb_templates_description_search ON nb_templates USING gin(to_tsvector('english', description));

-- 用户相关索引
CREATE INDEX IF NOT EXISTS idx_nb_user_favorites_user_id ON nb_user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_nb_user_likes_template_id ON nb_user_likes(template_id);
CREATE INDEX IF NOT EXISTS idx_nb_template_usage_logs_template_id ON nb_template_usage_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_nb_template_usage_logs_created_at ON nb_template_usage_logs(created_at);

-- ================================
-- 3. 创建触发器函数
-- ================================

-- 更新模板统计数据的触发器函数
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'nb_user_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE nb_templates 
            SET like_count = like_count + 1 
            WHERE id = NEW.template_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE nb_templates 
            SET like_count = like_count - 1 
            WHERE id = OLD.template_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'nb_user_comments' THEN
        IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
            UPDATE nb_templates 
            SET comment_count = comment_count + 1 
            WHERE id = NEW.template_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
                UPDATE nb_templates 
                SET comment_count = comment_count - 1 
                WHERE id = NEW.template_id;
            ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
                UPDATE nb_templates 
                SET comment_count = comment_count + 1 
                WHERE id = NEW.template_id;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'nb_user_ratings' THEN
        -- 重新计算平均评分
        UPDATE nb_templates 
        SET 
            rating_avg = (
                SELECT COALESCE(AVG(rating), 0) 
                FROM nb_user_ratings 
                WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
            ),
            rating_count = (
                SELECT COUNT(*) 
                FROM nb_user_ratings 
                WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
            )
        WHERE id = COALESCE(NEW.template_id, OLD.template_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_template_likes ON nb_user_likes;
CREATE TRIGGER trigger_update_template_likes
    AFTER INSERT OR DELETE ON nb_user_likes
    FOR EACH ROW EXECUTE FUNCTION update_template_stats();

DROP TRIGGER IF EXISTS trigger_update_template_comments ON nb_user_comments;
CREATE TRIGGER trigger_update_template_comments
    AFTER INSERT OR UPDATE ON nb_user_comments
    FOR EACH ROW EXECUTE FUNCTION update_template_stats();

DROP TRIGGER IF EXISTS trigger_update_template_ratings ON nb_user_ratings;
CREATE TRIGGER trigger_update_template_ratings
    AFTER INSERT OR UPDATE OR DELETE ON nb_user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_template_stats();

-- ================================
-- 4. 插入默认分类数据
-- ================================

INSERT INTO nb_template_categories (id, name, name_en, description, icon_url, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', '图像处理', 'Image Processing', '图像编辑、修复、风格转换等', '/icons/image-processing.svg', 1),
('550e8400-e29b-41d4-a716-446655440002', '3D建模', '3D Modeling', '手办、模型、立体设计等', '/icons/3d-modeling.svg', 2),
('550e8400-e29b-41d4-a716-446655440003', '室内设计', 'Interior Design', '家居装修、软装搭配等', '/icons/interior-design.svg', 3),
('550e8400-e29b-41d4-a716-446655440004', '艺术创作', 'Art Creation', '绘画、插画、艺术风格等', '/icons/art-creation.svg', 4)
ON CONFLICT (id) DO NOTHING;

-- ================================
-- 5. 插入默认标签数据
-- ================================

INSERT INTO nb_template_tags (name, color) VALUES
('热门', '#FF6B6B'),
('专业', '#4ECDC4'),
('简单', '#45B7D1'),
('高级', '#96CEB4'),
('创意', '#FFEAA7'),
('实用', '#DDA0DD'),
('快速', '#98D8C8'),
('精致', '#F7DC6F')
ON CONFLICT (name) DO NOTHING;

-- ================================
-- 6. 迁移现有JSON数据到数据库
-- ================================

-- 创建系统用户作为默认作者（使用指定的用户ID）
DO $$
DECLARE
    system_user_id UUID := 'e1b114bd-fe81-4822-b1f2-de28abded7d9';
    profile_exists BOOLEAN;
BEGIN
    -- 检查用户档案是否已存在
    SELECT EXISTS(
        SELECT 1 FROM nb_user_profiles WHERE user_id = system_user_id
    ) INTO profile_exists;
    
    -- 如果用户档案不存在，则创建
    IF NOT profile_exists THEN
        INSERT INTO nb_user_profiles (user_id, username, is_creator, creator_level)
        VALUES (system_user_id, 'System', true, 4);
        
        RAISE NOTICE '已创建系统用户档案，ID: %', system_user_id;
    ELSE
        RAISE NOTICE '系统用户档案已存在，跳过创建';
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE '外键约束错误: 用户ID % 在auth.users表中不存在', system_user_id;
        RAISE NOTICE '请确保该用户已在Supabase Authentication中创建';
    WHEN unique_violation THEN
        RAISE NOTICE '系统用户档案已存在（唯一约束冲突），跳过创建';
    WHEN OTHERS THEN
        RAISE NOTICE '创建系统用户档案时发生错误: %', SQLERRM;
END $$;

-- 迁移现有模板数据
INSERT INTO nb_templates (
    id,
    title,
    description,
    prompt,
    author_id,
    category_id,
    cover_image_url,
    example_images,
    status,
    is_featured,
    view_count,
    download_count,
    like_count,
    created_at,
    published_at
) VALUES
-- 热门手办模板
(
    gen_random_uuid(),
    '热门手办',
    '一键生成精致手办!Hot!',
    'Create a 1/7 scale commercialized figurine of the characters in the picture, in a realistic style, in a real environment. The figurine is placed on a computer desk. The figurine has a round transparent acrylic base, with no text on the base. The content on the computer screen is a 3D modeling process of this figurine. Next to the computer screen is a toy packaging box, designed in a style reminiscent of high-quality collectible figures, printed with original artwork. The packaging features two-dimensional flat illustrations.',
    'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID,
    '550e8400-e29b-41d4-a716-446655440002'::UUID, -- 3D建模分类
    '/images/1.1.png',
    ARRAY['/images/1.png'],
    'published',
    true,
    1250,
    380,
    95,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
),
-- 旧照片修复模板
(
    gen_random_uuid(),
    '旧照片修复',
    '一键修复旧照片!专业!惊艳!',
    'This is a technical and stylistic re-rendering of a vintage photograph. The goal is to make this exact scene—with the same people, outfits, poses, and scenery—look as if it were captured today by an elite portrait photographer using modern, professional equipment and a vibrant color grading style. Do not change any element of the scene; instead, fundamentally transform the quality of the image capture itself. 1. Vibrant, Saturated Color Science (New Priority): This is the most important instruction: The color grading must be completely modernized, vibrant, and deeply saturated. Remove every trace of the original''s faded, vintage color cast. The final colors should pop with life and energy, emulating a modern digital camera using a ''Vivid'' color profile. Specifically: Make any floral patterns rich and bold. Render solid colors as strong, clean, and striking. Ensure all skin tones are warm, healthy, and full of life—completely avoiding a pale, washed-out, or muted appearance. 2. Lighting Transformation: Completely discard the original''s harsh, on-camera flash lighting. Re-light the entire scene as if using a professional, off-camera studio setup. Create a large, soft key light from the front-left to sculpt the subjects'' faces with gentle, flattering shadows, creating depth and dimension. Add a subtle fill light from the right to soften the shadows. Eliminate the harsh glare on any glasses and create bright, sparkling catchlights in everyone''s eyes. 3. Hyper-Realistic Detail and Texture: Render the image with extreme 8K clarity. Skin must look natural, retaining age-appropriate pores and fine lines—strictly avoid a plastic or airbrushed appearance. The fabric textures must be hyper-defined: clearly show any intricate knitting, weaves of patterns, and texture of upholstery. Any wallpaper pattern should be sharp and clear. 4. Modern Camera and Lens Optics: The final image must look like it was captured on a high-end, full-frame digital camera with a sharp 85mm prime lens to create a subtle, natural separation between the subjects and the background. Ensure the dynamic range is wide, with deep, rich blacks and clean, controlled highlights.',
    'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- 图像处理分类
    'https://picsum.photos/id/1015/200/200',
    ARRAY['https://picsum.photos/id/1015/800/600'],
    'published',
    true,
    2100,
    650,
    156,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
),
-- PVC玩具模板
(
    gen_random_uuid(),
    'PVC玩具',
    '逼真的工艺技术制作出来的塑料模型',
    'Transform this illustration into a photorealistic PVC anime figure. Keep the original character''s design, pose, and colors exactly the same. Render it as a collectible figurine made of PVC plastic, with realistic painted surface and detailed shading. Apply glossy highlights on areas such as the hair and clothing, matte finish on the skin, and subtle seam lines as seen in real manufactured figures. Place the figure on a simple round display base, with a soft shadow cast beneath it. Use a neutral studio background, professional studio lighting, sharp focus, shallow depth of field, as if photographed for a catalog.',
    'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID,
    '550e8400-e29b-41d4-a716-446655440002'::UUID, -- 3D建模分类
    'https://picsum.photos/id/21/200/200',
    ARRAY['https://picsum.photos/id/21/800/600'],
    'published',
    false,
    890,
    220,
    67,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
),
-- 软装设计师模板
(
    gen_random_uuid(),
    '软装设计师',
    '软装设计动动嘴就完成!',
    'This is a photo of an empty living room [Empty Room Photo]. Redesign it in a cozy Scandinavian style. Add a light grey fabric sofa, a natural oak wood coffee table, several green potted plants, and a large, soft wool rug. The lighting should be bright and airy, coming from the window.',
    'e1b114bd-fe81-4822-b1f2-de28abded7d9'::UUID,
    '550e8400-e29b-41d4-a716-446655440003'::UUID, -- 室内设计分类
    'https://picsum.photos/id/1060/200/200',
    ARRAY['https://picsum.photos/id/1060/800/600'],
    'published',
    false,
    1450,
    420,
    89,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    prompt = EXCLUDED.prompt,
    updated_at = NOW();

-- ================================
-- 7. 为模板添加标签关联
-- ================================

-- 获取标签ID和模板ID并添加关联
DO $$
DECLARE
    tag_hot_id UUID;
    tag_pro_id UUID;
    tag_simple_id UUID;
    tag_creative_id UUID;
    tag_practical_id UUID;
    
    template_figurine_id UUID;
    template_photo_id UUID;
    template_pvc_id UUID;
    template_home_id UUID;
BEGIN
    -- 获取标签ID
    SELECT id INTO tag_hot_id FROM nb_template_tags WHERE name = '热门';
    SELECT id INTO tag_pro_id FROM nb_template_tags WHERE name = '专业';
    SELECT id INTO tag_simple_id FROM nb_template_tags WHERE name = '简单';
    SELECT id INTO tag_creative_id FROM nb_template_tags WHERE name = '创意';
    SELECT id INTO tag_practical_id FROM nb_template_tags WHERE name = '实用';
    
    -- 获取模板ID
    SELECT id INTO template_figurine_id FROM nb_templates WHERE title = '热门手办';
    SELECT id INTO template_photo_id FROM nb_templates WHERE title = '旧照片修复';
    SELECT id INTO template_pvc_id FROM nb_templates WHERE title = 'PVC玩具';
    SELECT id INTO template_home_id FROM nb_templates WHERE title = '软装设计师';
    
    -- 热门手办 - 热门、创意
    INSERT INTO nb_template_tag_relations (template_id, tag_id) VALUES
    (template_figurine_id, tag_hot_id),
    (template_figurine_id, tag_creative_id)
    ON CONFLICT DO NOTHING;
    
    -- 旧照片修复 - 专业、实用
    INSERT INTO nb_template_tag_relations (template_id, tag_id) VALUES
    (template_photo_id, tag_pro_id),
    (template_photo_id, tag_practical_id)
    ON CONFLICT DO NOTHING;
    
    -- PVC玩具 - 创意、简单
    INSERT INTO nb_template_tag_relations (template_id, tag_id) VALUES
    (template_pvc_id, tag_creative_id),
    (template_pvc_id, tag_simple_id)
    ON CONFLICT DO NOTHING;
    
    -- 软装设计师 - 实用、简单
    INSERT INTO nb_template_tag_relations (template_id, tag_id) VALUES
    (template_home_id, tag_practical_id),
    (template_home_id, tag_simple_id)
    ON CONFLICT DO NOTHING;
END $$;

-- ================================
-- 8. 更新标签使用计数
-- ================================

UPDATE nb_template_tags 
SET usage_count = (
    SELECT COUNT(*) 
    FROM nb_template_tag_relations 
    WHERE tag_id = nb_template_tags.id
);

-- ================================
-- 9. 创建RLS策略（Row Level Security）
-- ================================

-- 启用RLS
ALTER TABLE nb_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_user_comments ENABLE ROW LEVEL SECURITY;

-- 模板表策略
CREATE POLICY "Templates are viewable by everyone" ON nb_templates
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own templates" ON nb_templates
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own templates" ON nb_templates
    FOR UPDATE USING (auth.uid() = author_id);

-- 用户档案策略
CREATE POLICY "Profiles are viewable by everyone" ON nb_user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON nb_user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON nb_user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户交互策略
CREATE POLICY "Users can manage their own favorites" ON nb_user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own likes" ON nb_user_likes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own ratings" ON nb_user_ratings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON nb_user_comments
    FOR ALL USING (auth.uid() = user_id);

-- 评论可以被所有人查看
CREATE POLICY "Comments are viewable by everyone" ON nb_user_comments
    FOR SELECT USING (NOT is_deleted);

-- ================================
-- 完成迁移
-- ================================

-- 输出迁移完成信息
DO $$
BEGIN
    RAISE NOTICE '数据库迁移完成！';
    RAISE NOTICE '- 已创建所有表结构';
    RAISE NOTICE '- 已创建索引和触发器';
    RAISE NOTICE '- 已迁移4个现有模板';
    RAISE NOTICE '- 已设置RLS策略';
    RAISE NOTICE '请在Supabase控制台中创建系统用户：system@nanobanana.com';
END $$;
