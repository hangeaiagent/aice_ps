-- 用户任务记录系统数据库表
-- 创建日期: 2025-09-18
-- 功能: 记录用户图片生成任务的完整信息

-- 1. 任务记录主表
CREATE TABLE IF NOT EXISTS user_task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL DEFAULT 'image_generation', -- 任务类型: image_generation, image_edit, etc.
    prompt TEXT NOT NULL, -- 用户输入的提示词
    original_image_url TEXT, -- 原始图片URL (如果有)
    generated_image_url TEXT, -- 生成的图片URL
    aws_original_key TEXT, -- AWS S3原始图片key
    aws_generated_key TEXT, -- AWS S3生成图片key
    
    -- 消耗统计
    tokens_used INTEGER DEFAULT 0, -- 消耗的token数量
    credits_deducted INTEGER DEFAULT 0, -- 扣除的积分点数
    
    -- 任务状态和结果
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT, -- 错误信息(如果失败)
    
    -- 技术参数
    aspect_ratio VARCHAR(10), -- 宽高比: 1:1, 16:9, etc.
    model_version VARCHAR(50), -- 使用的模型版本
    generation_time_ms INTEGER, -- 生成耗时(毫秒)
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. 任务统计汇总表 (可选，用于快速查询统计信息)
CREATE TABLE IF NOT EXISTS user_task_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 统计周期
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    period_date DATE NOT NULL, -- 统计日期
    
    -- 任务统计
    total_tasks INTEGER DEFAULT 0,
    successful_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    
    -- 消耗统计
    total_tokens_used INTEGER DEFAULT 0,
    total_credits_deducted INTEGER DEFAULT 0,
    
    -- 时间统计
    total_generation_time_ms BIGINT DEFAULT 0,
    avg_generation_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保每个用户每个周期只有一条记录
    UNIQUE(user_id, period_type, period_date)
);

-- 3. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_task_history_user_id ON user_task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_history_created_at ON user_task_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_task_history_status ON user_task_history(status);
CREATE INDEX IF NOT EXISTS idx_user_task_history_user_created ON user_task_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_task_statistics_user_id ON user_task_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_statistics_period ON user_task_statistics(period_type, period_date);

-- 4. 添加表注释
COMMENT ON TABLE user_task_history IS '用户任务历史记录表，存储图片生成等任务的完整信息';
COMMENT ON COLUMN user_task_history.id IS '任务记录唯一标识';
COMMENT ON COLUMN user_task_history.user_id IS '关联用户ID';
COMMENT ON COLUMN user_task_history.task_type IS '任务类型：image_generation(图片生成), image_edit(图片编辑)等';
COMMENT ON COLUMN user_task_history.prompt IS '用户输入的提示词';
COMMENT ON COLUMN user_task_history.original_image_url IS '原始图片的访问URL';
COMMENT ON COLUMN user_task_history.generated_image_url IS '生成图片的访问URL';
COMMENT ON COLUMN user_task_history.aws_original_key IS 'AWS S3中原始图片的存储key';
COMMENT ON COLUMN user_task_history.aws_generated_key IS 'AWS S3中生成图片的存储key';
COMMENT ON COLUMN user_task_history.tokens_used IS '本次任务消耗的token数量';
COMMENT ON COLUMN user_task_history.credits_deducted IS '本次任务扣除的积分点数';
COMMENT ON COLUMN user_task_history.status IS '任务状态：pending(等待), processing(处理中), completed(完成), failed(失败)';
COMMENT ON COLUMN user_task_history.aspect_ratio IS '图片宽高比：1:1, 16:9, 9:16, 4:3, 3:4';
COMMENT ON COLUMN user_task_history.model_version IS '使用的AI模型版本';
COMMENT ON COLUMN user_task_history.generation_time_ms IS '图片生成耗时，单位毫秒';

COMMENT ON TABLE user_task_statistics IS '用户任务统计汇总表，按时间周期汇总用户的任务数据';
COMMENT ON COLUMN user_task_statistics.period_type IS '统计周期类型：daily(日), weekly(周), monthly(月), yearly(年)';
COMMENT ON COLUMN user_task_statistics.period_date IS '统计周期的日期';
COMMENT ON COLUMN user_task_statistics.total_tasks IS '总任务数';
COMMENT ON COLUMN user_task_statistics.successful_tasks IS '成功任务数';
COMMENT ON COLUMN user_task_statistics.failed_tasks IS '失败任务数';
COMMENT ON COLUMN user_task_statistics.total_tokens_used IS '总消耗token数';
COMMENT ON COLUMN user_task_statistics.total_credits_deducted IS '总扣除积分数';

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_task_history_updated_at 
    BEFORE UPDATE ON user_task_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_task_statistics_updated_at 
    BEFORE UPDATE ON user_task_statistics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建RLS (Row Level Security) 策略
ALTER TABLE user_task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_statistics ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的任务记录
CREATE POLICY "Users can view own task history" ON user_task_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task history" ON user_task_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task history" ON user_task_history
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能查看自己的统计数据
CREATE POLICY "Users can view own task statistics" ON user_task_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task statistics" ON user_task_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task statistics" ON user_task_statistics
    FOR UPDATE USING (auth.uid() = user_id);

-- 7. 创建统计更新函数
CREATE OR REPLACE FUNCTION update_user_task_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 当任务完成时，更新统计数据
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- 更新日统计
        INSERT INTO user_task_statistics (
            user_id, period_type, period_date,
            total_tasks, successful_tasks,
            total_tokens_used, total_credits_deducted,
            total_generation_time_ms
        ) VALUES (
            NEW.user_id, 'daily', CURRENT_DATE,
            1, 1,
            NEW.tokens_used, NEW.credits_deducted,
            NEW.generation_time_ms
        )
        ON CONFLICT (user_id, period_type, period_date)
        DO UPDATE SET
            total_tasks = user_task_statistics.total_tasks + 1,
            successful_tasks = user_task_statistics.successful_tasks + 1,
            total_tokens_used = user_task_statistics.total_tokens_used + NEW.tokens_used,
            total_credits_deducted = user_task_statistics.total_credits_deducted + NEW.credits_deducted,
            total_generation_time_ms = user_task_statistics.total_generation_time_ms + NEW.generation_time_ms,
            avg_generation_time_ms = (user_task_statistics.total_generation_time_ms + NEW.generation_time_ms) / (user_task_statistics.successful_tasks + 1),
            updated_at = NOW();
    END IF;
    
    -- 当任务失败时，更新失败统计
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        INSERT INTO user_task_statistics (
            user_id, period_type, period_date,
            total_tasks, failed_tasks
        ) VALUES (
            NEW.user_id, 'daily', CURRENT_DATE,
            1, 1
        )
        ON CONFLICT (user_id, period_type, period_date)
        DO UPDATE SET
            total_tasks = user_task_statistics.total_tasks + 1,
            failed_tasks = user_task_statistics.failed_tasks + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_statistics_trigger
    AFTER UPDATE ON user_task_history
    FOR EACH ROW EXECUTE FUNCTION update_user_task_statistics();
