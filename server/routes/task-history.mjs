/**
 * 用户任务历史记录 API 路由
 * 功能: 管理用户的图片生成任务记录
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '../services/storageService.js';

const router = express.Router();

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 配置 multer 用于处理文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 日志函数
const log = (level, message, data = null, line = null) => {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  const lineInfo = line ? ` [Line:${line}]` : '';
  console.log(`[${timestamp}] [TASK-HISTORY] [${level}]${lineInfo} ${message}${logData ? '\n' + logData : ''}`);
};

// 认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '需要认证' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: '无效的认证令牌' });
    }

    req.user = user;
    next();
  } catch (error) {
    log('ERROR', '认证失败', { error: error.message });
    res.status(401).json({ success: false, error: '认证失败' });
  }
};

// 上传图片到存储服务（支持本地和AWS）
const uploadToStorage = async (buffer, filename, contentType) => {
  try {
    // 使用 storageService 来处理文件存储
    const imageUrl = await storageService.saveImage(buffer, filename, contentType);
    return imageUrl;
  } catch (error) {
    log('ERROR', '文件上传失败', { error: error.message, filename });
    throw error;
  }
};

// 1. 创建任务记录
router.post('/tasks', authenticateUser, async (req, res) => {
  try {
    const {
      task_type = 'image_generation',
      prompt,
      aspect_ratio,
      model_version = 'default'
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: '缺少提示词' });
    }

    const taskData = {
      user_id: req.user.id,
      task_type,
      prompt,
      aspect_ratio,
      model_version,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('user_task_history')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      log('ERROR', '创建任务记录失败', { error: error.message, taskData });
      return res.status(500).json({ success: false, error: '创建任务记录失败' });
    }

    log('INFO', '任务记录创建成功', { taskId: data.id, userId: req.user.id });
    res.json({ success: true, data });

  } catch (error) {
    log('ERROR', '创建任务记录异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 2. 更新任务记录 (上传原始图片)
router.put('/tasks/:taskId/original-image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ success: false, error: '缺少图片文件' });
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('user_task_history')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    // 生成文件名
    const fileExtension = imageFile.originalname.split('.').pop() || 'jpg';
    const filename = `task-history_${req.user.id}_${taskId}_original.${fileExtension}`;

    // 上传到存储服务
    const uploadResult = await uploadToStorage(imageFile.buffer, filename, imageFile.mimetype);
    
    // 提取正确的URL
    const imageUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult.imageUrl;
    const storageKey = typeof uploadResult === 'string' ? filename : uploadResult.filename;

    // 更新任务记录
    const { data: updatedTask, error: updateError } = await supabase
      .from('user_task_history')
      .update({
        original_image_url: imageUrl,
        aws_original_key: storageKey,
        status: 'processing'
      })
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) {
      log('ERROR', '更新任务原始图片失败', { error: updateError.message, taskId });
      return res.status(500).json({ success: false, error: '更新任务失败' });
    }

    log('INFO', '原始图片上传成功', { taskId, imageUrl });
    res.json({ success: true, data: updatedTask });

  } catch (error) {
    log('ERROR', '上传原始图片异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 3. 完成任务记录 (上传生成图片)
router.put('/tasks/:taskId/complete', authenticateUser, async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      generated_image_data, // base64 图片数据
      tokens_used = 0,
      credits_deducted = 0,
      generation_time_ms = 0,
      error_message
    } = req.body;

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('user_task_history')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    let updateData = {
      tokens_used,
      credits_deducted,
      generation_time_ms,
      completed_at: new Date().toISOString()
    };

    // 如果有生成的图片数据，上传到S3
    if (generated_image_data && !error_message) {
      try {
        // 解析base64数据
        const base64Data = generated_image_data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 生成文件名
        const filename = `task-history_${req.user.id}_${taskId}_generated.jpg`;
        
        // 上传到存储服务
        const uploadResult = await uploadToStorage(buffer, filename, 'image/jpeg');
        
        // 提取正确的URL
        const imageUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult.imageUrl;
        const storageKey = typeof uploadResult === 'string' ? filename : uploadResult.filename;
        
        updateData.generated_image_url = imageUrl;
        updateData.aws_generated_key = storageKey;
        updateData.status = 'completed';
        
        log('INFO', '生成图片上传成功', { taskId, imageUrl });
      } catch (uploadError) {
        log('ERROR', '生成图片上传失败', { error: uploadError.message, taskId });
        updateData.status = 'failed';
        updateData.error_message = '图片上传失败: ' + uploadError.message;
      }
    } else if (error_message) {
      // 任务失败
      updateData.status = 'failed';
      updateData.error_message = error_message;
    } else {
      // 任务成功但没有生成图片数据
      updateData.status = 'completed';
    }

    // 更新任务记录
    const { data: updatedTask, error: updateError } = await supabase
      .from('user_task_history')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) {
      log('ERROR', '完成任务记录失败', { error: updateError.message, taskId });
      return res.status(500).json({ success: false, error: '更新任务失败' });
    }

    log('INFO', '任务记录完成', { taskId, status: updateData.status });
    res.json({ success: true, data: updatedTask });

  } catch (error) {
    log('ERROR', '完成任务记录异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 4. 获取任务历史列表
router.get('/tasks', authenticateUser, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      start_date,
      end_date,
      status,
      task_type
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_task_history')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // 时间范围筛选
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // 状态筛选
    if (status) {
      query = query.eq('status', status);
    }

    // 任务类型筛选
    if (task_type) {
      query = query.eq('task_type', task_type);
    }

    // 分页
    query = query.range(offset, offset + limit - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      log('ERROR', '获取任务历史失败', { error: error.message, userId: req.user.id });
      return res.status(500).json({ success: false, error: '获取任务历史失败' });
    }

    const totalPages = Math.ceil(count / limit);

    log('INFO', '获取任务历史成功', { 
      userId: req.user.id, 
      page, 
      limit, 
      total: count,
      returned: tasks.length 
    });

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: count,
          total_pages: totalPages,
          has_more: page < totalPages
        }
      }
    });

  } catch (error) {
    log('ERROR', '获取任务历史异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 5. 获取任务统计信息
router.get('/statistics', authenticateUser, async (req, res) => {
  try {
    const { period = 'daily', start_date, end_date } = req.query;

    let query = supabase
      .from('user_task_statistics')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('period_type', period)
      .order('period_date', { ascending: false });

    if (start_date) {
      query = query.gte('period_date', start_date);
    }
    if (end_date) {
      query = query.lte('period_date', end_date);
    }

    const { data: statistics, error } = await query;

    if (error) {
      log('ERROR', '获取统计信息失败', { error: error.message, userId: req.user.id });
      return res.status(500).json({ success: false, error: '获取统计信息失败' });
    }

    // 计算总计
    const totals = statistics.reduce((acc, stat) => ({
      total_tasks: acc.total_tasks + stat.total_tasks,
      successful_tasks: acc.successful_tasks + stat.successful_tasks,
      failed_tasks: acc.failed_tasks + stat.failed_tasks,
      total_tokens_used: acc.total_tokens_used + stat.total_tokens_used,
      total_credits_deducted: acc.total_credits_deducted + stat.total_credits_deducted,
      total_generation_time_ms: acc.total_generation_time_ms + stat.total_generation_time_ms
    }), {
      total_tasks: 0,
      successful_tasks: 0,
      failed_tasks: 0,
      total_tokens_used: 0,
      total_credits_deducted: 0,
      total_generation_time_ms: 0
    });

    res.json({
      success: true,
      data: {
        statistics,
        totals: {
          ...totals,
          success_rate: totals.total_tasks > 0 ? (totals.successful_tasks / totals.total_tasks * 100).toFixed(2) : 0,
          avg_generation_time_ms: totals.successful_tasks > 0 ? Math.round(totals.total_generation_time_ms / totals.successful_tasks) : 0
        }
      }
    });

  } catch (error) {
    log('ERROR', '获取统计信息异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 6. 获取单个任务详情
router.get('/tasks/:taskId', authenticateUser, async (req, res) => {
  try {
    const { taskId } = req.params;

    const { data: task, error } = await supabase
      .from('user_task_history')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    res.json({ success: true, data: task });

  } catch (error) {
    log('ERROR', '获取任务详情异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 7. 删除任务记录
router.delete('/tasks/:taskId', authenticateUser, async (req, res) => {
  try {
    const { taskId } = req.params;

    // 获取任务信息以删除S3文件
    const { data: task, error: getError } = await supabase
      .from('user_task_history')
      .select('aws_original_key, aws_generated_key')
      .eq('id', taskId)
      .eq('user_id', req.user.id)
      .single();

    if (getError || !task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    // 注意：本地存储的文件可能需要手动清理
    // AWS S3 可以配置生命周期策略自动清理
    // 这里暂时不实现文件删除，避免误删重要文件
    log('INFO', '任务文件清理跳过', { 
      originalKey: task.aws_original_key, 
      generatedKey: task.aws_generated_key 
    });

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('user_task_history')
      .delete()
      .eq('id', taskId)
      .eq('user_id', req.user.id);

    if (deleteError) {
      log('ERROR', '删除任务记录失败', { error: deleteError.message, taskId });
      return res.status(500).json({ success: false, error: '删除任务失败' });
    }

    log('INFO', '任务记录删除成功', { taskId, userId: req.user.id });
    res.json({ success: true, message: '任务删除成功' });

  } catch (error) {
    log('ERROR', '删除任务记录异常', { error: error.message });
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

export default router;
