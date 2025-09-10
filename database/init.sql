-- AicePS 项目数据库初始化脚本
-- 基于 Supabase PostgreSQL 数据库

-- 创建用户表（扩展 Supabase Auth 的用户信息）
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL DEFAULT auth.uid(),
    email TEXT NOT NULL,
    display_name TEXT NULL,
    avatar_url TEXT NULL,
    provider TEXT NOT NULL DEFAULT 'email'::TEXT,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    preferences JSON NULL DEFAULT '{}'::JSON,
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_email_key UNIQUE (email)
);

-- 添加表注释
COMMENT ON TABLE public.user_profiles IS '用户配置表，扩展 Supabase Auth 用户信息';

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.id IS '用户唯一标识符，与 Supabase Auth 用户ID关联';
COMMENT ON COLUMN public.user_profiles.email IS '用户邮箱地址';
COMMENT ON COLUMN public.user_profiles.display_name IS '用户显示名称';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '用户头像URL';
COMMENT ON COLUMN public.user_profiles.provider IS '认证提供商（email、google、github等）';
COMMENT ON COLUMN public.user_profiles.created_at IS '用户创建时间';
COMMENT ON COLUMN public.user_profiles.updated_at IS '用户信息最后更新时间';
COMMENT ON COLUMN public.user_profiles.last_sign_in IS '用户最后登录时间';
COMMENT ON COLUMN public.user_profiles.preferences IS '用户偏好设置JSON数据';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON public.user_profiles(provider);

-- 创建用户项目表
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_data JSON NULL DEFAULT '{}'::JSON,
    thumbnail_url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT user_projects_pkey PRIMARY KEY (id)
);

-- 添加项目表注释
COMMENT ON TABLE public.user_projects IS '用户项目表，存储用户的图像编辑项目';
COMMENT ON COLUMN public.user_projects.id IS '项目唯一标识符';
COMMENT ON COLUMN public.user_projects.user_id IS '项目所属用户ID';
COMMENT ON COLUMN public.user_projects.project_name IS '项目名称';
COMMENT ON COLUMN public.user_projects.project_data IS '项目数据JSON格式';
COMMENT ON COLUMN public.user_projects.thumbnail_url IS '项目缩略图URL';
COMMENT ON COLUMN public.user_projects.created_at IS '项目创建时间';
COMMENT ON COLUMN public.user_projects.updated_at IS '项目最后更新时间';

-- 创建项目表索引
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_created_at ON public.user_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_user_projects_name ON public.user_projects(project_name);

-- 创建用户使用统计表
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_count INTEGER NOT NULL DEFAULT 1,
    last_action_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT user_usage_stats_pkey PRIMARY KEY (id)
);

-- 添加使用统计表注释
COMMENT ON TABLE public.user_usage_stats IS '用户使用统计表，记录用户各种操作的使用情况';
COMMENT ON COLUMN public.user_usage_stats.id IS '统计记录唯一标识符';
COMMENT ON COLUMN public.user_usage_stats.user_id IS '用户ID';
COMMENT ON COLUMN public.user_usage_stats.action_type IS '操作类型（adjust、filter、crop、fusion等）';
COMMENT ON COLUMN public.user_usage_stats.action_count IS '操作次数';
COMMENT ON COLUMN public.user_usage_stats.last_action_at IS '最后操作时间';
COMMENT ON COLUMN public.user_usage_stats.created_at IS '记录创建时间';

-- 创建使用统计表索引
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_action_type ON public.user_usage_stats(action_type);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_last_action ON public.user_usage_stats(last_action_at);

-- 创建用户配置表的更新触发器函数
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 创建项目表的更新触发器
DROP TRIGGER IF EXISTS trigger_update_user_projects_updated_at ON public.user_projects;
CREATE TRIGGER trigger_update_user_projects_updated_at
    BEFORE UPDATE ON public.user_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 启用行级安全策略（RLS）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_stats ENABLE ROW LEVEL SECURITY;

-- 创建用户配置表的安全策略
CREATE POLICY "用户只能查看和更新自己的配置" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- 创建项目表的安全策略
CREATE POLICY "用户只能管理自己的项目" ON public.user_projects
    FOR ALL USING (auth.uid() = user_id);

-- 创建使用统计表的安全策略
CREATE POLICY "用户只能查看自己的使用统计" ON public.user_usage_stats
    FOR ALL USING (auth.uid() = user_id);

-- 创建自动同步用户配置的函数
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        display_name, 
        avatar_url, 
        provider,
        created_at,
        last_sign_in
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        NEW.created_at,
        NEW.last_sign_in_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        avatar_url = NEW.raw_user_meta_data->>'avatar_url',
        last_sign_in = NEW.last_sign_in_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户注册时自动同步配置的触发器
DROP TRIGGER IF EXISTS trigger_sync_user_profile ON auth.users;
CREATE TRIGGER trigger_sync_user_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();