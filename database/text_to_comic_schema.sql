-- 字形-漫画互转功能数据库表结构
-- 基于 Supabase 数据库系统，遵循项目规范

-- =================================
-- 1. 文本转漫画项目表
-- =================================
CREATE TABLE comic_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_text TEXT NOT NULL,
    extracted_plot JSONB,
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE comic_projects IS '文本转漫画项目表';
COMMENT ON COLUMN comic_projects.id IS '项目唯一标识符';
COMMENT ON COLUMN comic_projects.user_id IS '用户ID，关联用户表';
COMMENT ON COLUMN comic_projects.title IS '项目标题';
COMMENT ON COLUMN comic_projects.original_text IS '原始输入文本';
COMMENT ON COLUMN comic_projects.extracted_plot IS '提取的关键情节JSON格式';
COMMENT ON COLUMN comic_projects.status IS '项目状态：created, processing, completed, failed';
COMMENT ON COLUMN comic_projects.created_at IS '创建时间';
COMMENT ON COLUMN comic_projects.updated_at IS '更新时间';
COMMENT ON COLUMN comic_projects.completed_at IS '完成时间';
COMMENT ON COLUMN comic_projects.settings IS '项目设置：字体、风格等';

-- =================================
-- 2. 漫画页面表
-- =================================
CREATE TABLE comic_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES comic_projects(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    scene_description TEXT NOT NULL,
    dialogue TEXT,
    image_url VARCHAR(500),
    image_prompt TEXT,
    generation_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, page_number)
);

COMMENT ON TABLE comic_pages IS '漫画页面表';
COMMENT ON COLUMN comic_pages.id IS '页面唯一标识符';
COMMENT ON COLUMN comic_pages.project_id IS '项目ID，关联项目表';
COMMENT ON COLUMN comic_pages.page_number IS '页面序号';
COMMENT ON COLUMN comic_pages.scene_description IS '场景描述';
COMMENT ON COLUMN comic_pages.dialogue IS '对话内容';
COMMENT ON COLUMN comic_pages.image_url IS '生成的漫画图片URL';
COMMENT ON COLUMN comic_pages.image_prompt IS '图片生成提示词';
COMMENT ON COLUMN comic_pages.generation_status IS '生成状态：pending, generating, completed, failed';
COMMENT ON COLUMN comic_pages.created_at IS '创建时间';
COMMENT ON COLUMN comic_pages.updated_at IS '更新时间';

-- =================================
-- 3. 文本框表
-- =================================
CREATE TABLE comic_text_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES comic_pages(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    font_family VARCHAR(100) DEFAULT 'OpenDyslexic',
    font_size INTEGER DEFAULT 16,
    text_color VARCHAR(20) DEFAULT '#000000',
    background_color VARCHAR(20) DEFAULT '#FFFFFF',
    box_type VARCHAR(50) DEFAULT 'dialogue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE comic_text_boxes IS '漫画文本框表';
COMMENT ON COLUMN comic_text_boxes.id IS '文本框唯一标识符';
COMMENT ON COLUMN comic_text_boxes.page_id IS '页面ID，关联页面表';
COMMENT ON COLUMN comic_text_boxes.text_content IS '文本内容';
COMMENT ON COLUMN comic_text_boxes.position_x IS 'X坐标位置';
COMMENT ON COLUMN comic_text_boxes.position_y IS 'Y坐标位置';
COMMENT ON COLUMN comic_text_boxes.width IS '文本框宽度';
COMMENT ON COLUMN comic_text_boxes.height IS '文本框高度';
COMMENT ON COLUMN comic_text_boxes.font_family IS '字体族：OpenDyslexic, Arial等';
COMMENT ON COLUMN comic_text_boxes.font_size IS '字体大小';
COMMENT ON COLUMN comic_text_boxes.text_color IS '文字颜色';
COMMENT ON COLUMN comic_text_boxes.background_color IS '背景颜色';
COMMENT ON COLUMN comic_text_boxes.box_type IS '文本框类型：dialogue, narration, thought';
COMMENT ON COLUMN comic_text_boxes.created_at IS '创建时间';

-- =================================
-- 4. 处理日志表
-- =================================
CREATE TABLE comic_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES comic_projects(id) ON DELETE CASCADE,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    error_details JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE comic_processing_logs IS '漫画处理日志表';
COMMENT ON COLUMN comic_processing_logs.id IS '日志唯一标识符';
COMMENT ON COLUMN comic_processing_logs.project_id IS '项目ID，关联项目表';
COMMENT ON COLUMN comic_processing_logs.step IS '处理步骤：text_analysis, plot_extraction, image_generation等';
COMMENT ON COLUMN comic_processing_logs.status IS '状态：started, completed, failed';
COMMENT ON COLUMN comic_processing_logs.message IS '处理消息';
COMMENT ON COLUMN comic_processing_logs.error_details IS '错误详情JSON';
COMMENT ON COLUMN comic_processing_logs.processing_time_ms IS '处理时间（毫秒）';
COMMENT ON COLUMN comic_processing_logs.created_at IS '创建时间';

-- =================================
-- 5. 创建索引
-- =================================
CREATE INDEX idx_comic_projects_user_id ON comic_projects(user_id);
CREATE INDEX idx_comic_projects_status ON comic_projects(status);
CREATE INDEX idx_comic_projects_created_at ON comic_projects(created_at DESC);

CREATE INDEX idx_comic_pages_project_id ON comic_pages(project_id);
CREATE INDEX idx_comic_pages_page_number ON comic_pages(project_id, page_number);
CREATE INDEX idx_comic_pages_status ON comic_pages(generation_status);

CREATE INDEX idx_comic_text_boxes_page_id ON comic_text_boxes(page_id);

CREATE INDEX idx_comic_processing_logs_project_id ON comic_processing_logs(project_id);
CREATE INDEX idx_comic_processing_logs_created_at ON comic_processing_logs(created_at DESC);

-- =================================
-- 6. RLS 安全策略
-- =================================
-- 启用行级安全
ALTER TABLE comic_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_text_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_processing_logs ENABLE ROW LEVEL SECURITY;

-- 项目表安全策略
CREATE POLICY "Users can view own comic projects" ON comic_projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comic projects" ON comic_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comic projects" ON comic_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comic projects" ON comic_projects
    FOR DELETE USING (auth.uid() = user_id);

-- 页面表安全策略
CREATE POLICY "Users can view own comic pages" ON comic_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM comic_projects 
            WHERE comic_projects.id = comic_pages.project_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own comic pages" ON comic_pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM comic_projects 
            WHERE comic_projects.id = comic_pages.project_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own comic pages" ON comic_pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM comic_projects 
            WHERE comic_projects.id = comic_pages.project_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own comic pages" ON comic_pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM comic_projects 
            WHERE comic_projects.id = comic_pages.project_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

-- 文本框表安全策略
CREATE POLICY "Users can view own comic text boxes" ON comic_text_boxes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM comic_pages 
            JOIN comic_projects ON comic_projects.id = comic_pages.project_id
            WHERE comic_pages.id = comic_text_boxes.page_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own comic text boxes" ON comic_text_boxes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM comic_pages 
            JOIN comic_projects ON comic_projects.id = comic_pages.project_id
            WHERE comic_pages.id = comic_text_boxes.page_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own comic text boxes" ON comic_text_boxes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM comic_pages 
            JOIN comic_projects ON comic_projects.id = comic_pages.project_id
            WHERE comic_pages.id = comic_text_boxes.page_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own comic text boxes" ON comic_text_boxes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM comic_pages 
            JOIN comic_projects ON comic_projects.id = comic_pages.project_id
            WHERE comic_pages.id = comic_text_boxes.page_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

-- 日志表安全策略
CREATE POLICY "Users can view own comic processing logs" ON comic_processing_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM comic_projects 
            WHERE comic_projects.id = comic_processing_logs.project_id 
            AND comic_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "System can create comic processing logs" ON comic_processing_logs
    FOR INSERT WITH CHECK (true);