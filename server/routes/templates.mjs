// NB提示词模板库 - 后端API路由
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// 日志函数
const log = (level, message, data = null, lineNumber = null) => {
  const timestamp = new Date().toISOString();
  const line = lineNumber ? `[Line:${lineNumber}]` : '';
  console.log(`[${timestamp}] [TEMPLATES] [${level}] ${line} ${message}`);
  if (data) {
    console.log(`[${timestamp}] [TEMPLATES] [DATA] ${line}`, JSON.stringify(data, null, 2));
  }
};

// 认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      log('WARN', '用户认证失败', { error: error.message }, 35);
      req.user = null;
    } else {
      req.user = user;
      log('INFO', '用户认证成功', { userId: user.id }, 38);
    }

    next();
  } catch (error) {
    log('ERROR', '认证中间件错误', { error: error.message }, 42);
    req.user = null;
    next();
  }
};

// 需要登录的中间件
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '需要登录'
    });
  }
  next();
};

// ================================
// 公开接口
// ================================

// 获取模板列表
router.get('/templates', authenticateUser, async (req, res) => {
  try {
    log('INFO', '获取模板列表请求', req.query, 62);

    const {
      page = 1,
      limit = 20,
      category,
      tags,
      search,
      sort = 'popular',
      author,
      featured,
      premium
    } = req.query;

    let query = supabase
      .from('nb_templates')
      .select('*')
      .eq('status', 'published');

    // 输出SQL查询信息用于调试
    log('INFO', '执行数据库查询', {
      table: 'nb_templates',
      select: '*',
      filters: { status: 'published' },
      queryParams: req.query
    }, 89);

    // 分类筛选
    if (category) {
      query = query.eq('category_id', category);
    }

    // 作者筛选
    if (author) {
      query = query.eq('author_id', author);
    }

    // 特色/付费筛选
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (premium === 'true') {
      query = query.eq('is_premium', true);
    }

    // 搜索
    if (search) {
      query = query.or(`
        title.ilike.%${search}%,
        description.ilike.%${search}%,
        prompt.ilike.%${search}%
      `);
    }

    // 排序
    switch (sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        break;
      case 'downloads':
        query = query.order('download_count', { ascending: false });
        break;
      default: // popular
        query = query.order('like_count', { ascending: false });
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      log('ERROR', '数据库查询失败', { 
        error: error.message,
        table: 'nb_templates',
        query: 'SELECT * FROM nb_templates WHERE status = \'published\''
      }, 121);
      throw error;
    }

    log('INFO', '数据库查询成功', { 
      table: 'nb_templates',
      recordCount: templates?.length || 0,
      totalCount: count || 0,
      sampleData: templates?.[0] ? {
        id: templates[0].id,
        title: templates[0].title,
        author_id: templates[0].author_id
      } : null,
      actualSQL: `SELECT * FROM nb_templates WHERE status = 'published' LIMIT ${limit} OFFSET ${(page - 1) * limit}`
    }, 125);

    // 如果用户已登录，获取用户交互数据
    if (req.user && templates && templates.length > 0) {
      const templateIds = templates.map(t => t.id);
      
      const [likesData, favoritesData, ratingsData] = await Promise.all([
        supabase
          .from('nb_user_likes')
          .select('template_id')
          .eq('user_id', req.user.id)
          .in('template_id', templateIds),
        supabase
          .from('nb_user_favorites')
          .select('template_id')
          .eq('user_id', req.user.id)
          .in('template_id', templateIds),
        supabase
          .from('nb_user_ratings')
          .select('template_id, rating')
          .eq('user_id', req.user.id)
          .in('template_id', templateIds)
      ]);

      const likedIds = new Set(likesData.data?.map(l => l.template_id) || []);
      const favoritedIds = new Set(favoritesData.data?.map(f => f.template_id) || []);
      const ratingsMap = new Map(
        ratingsData.data?.map(r => [r.template_id, r.rating]) || []
      );

      // 添加用户交互数据
      templates.forEach(template => {
        template.user_interaction = {
          is_liked: likedIds.has(template.id),
          is_favorited: favoritedIds.has(template.id),
          user_rating: ratingsMap.get(template.id)
        };
      });
    }

    // 记录浏览日志
    if (req.user && templates && templates.length > 0) {
      const viewLogs = templates.map(template => ({
        user_id: req.user.id,
        template_id: template.id,
        action: 'view',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }));

      // 异步插入日志，不阻塞响应
      supabase
        .from('nb_template_usage_logs')
        .insert(viewLogs)
        .then(() => log('INFO', '浏览日志记录成功', null, 167))
        .catch(error => log('WARN', '浏览日志记录失败', { error: error.message }, 168));
    }

    res.json({
      success: true,
      data: {
        templates: templates || [],
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + (templates?.length || 0) < (count || 0)
      }
    });

  } catch (error) {
    log('ERROR', '获取模板列表错误', { error: error.message }, 181);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取模板详情
router.get('/templates/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    log('INFO', '获取模板详情', { templateId: id }, 192);

    const { data: template, error } = await supabase
      .from('nb_templates')
      .select(`
        *,
        author:nb_user_profiles(id, username, avatar_url, is_creator, creator_level),
        category:nb_template_categories(id, name, name_en, description),
        tags:nb_template_tag_relations(
          nb_template_tags(id, name, color)
        )
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error) {
      log('ERROR', '查询模板详情失败', { error: error.message }, 207);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: '模板不存在'
        });
      }
      throw error;
    }

    // 获取用户交互数据
    let userInteraction = null;
    if (req.user) {
      const [likeData, favoriteData, ratingData] = await Promise.all([
        supabase
          .from('nb_user_likes')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('template_id', id)
          .single(),
        supabase
          .from('nb_user_favorites')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('template_id', id)
          .single(),
        supabase
          .from('nb_user_ratings')
          .select('rating')
          .eq('user_id', req.user.id)
          .eq('template_id', id)
          .single()
      ]);

      userInteraction = {
        is_liked: !!likeData.data,
        is_favorited: !!favoriteData.data,
        user_rating: ratingData.data?.rating || null
      };

      // 记录详情查看日志
      await supabase
        .from('nb_template_usage_logs')
        .insert({
          user_id: req.user.id,
          template_id: id,
          action: 'view',
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
    }

    // 增加浏览计数
    await supabase
      .from('nb_templates')
      .update({ view_count: template.view_count + 1 })
      .eq('id', id);

    template.user_interaction = userInteraction;

    log('INFO', '模板详情获取成功', { templateId: id }, 256);

    res.json({
      success: true,
      data: { template }
    });

  } catch (error) {
    log('ERROR', '获取模板详情错误', { error: error.message }, 263);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取分类列表
router.get('/categories', async (req, res) => {
  try {
    log('INFO', '获取分类列表', null, 273);

    const { data: categories, error } = await supabase
      .from('nb_template_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      log('ERROR', '查询分类失败', { error: error.message }, 281);
      throw error;
    }

    res.json({
      success: true,
      data: { categories: categories || [] }
    });

  } catch (error) {
    log('ERROR', '获取分类列表错误', { error: error.message }, 290);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取标签列表
router.get('/tags', async (req, res) => {
  try {
    log('INFO', '获取标签列表', null, 300);

    const { data: tags, error } = await supabase
      .from('nb_template_tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      log('ERROR', '查询标签失败', { error: error.message }, 308);
      throw error;
    }

    res.json({
      success: true,
      data: { tags: tags || [] }
    });

  } catch (error) {
    log('ERROR', '获取标签列表错误', { error: error.message }, 317);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// 需要认证的接口
// ================================

// 点赞/取消点赞
router.post('/templates/:id/like', authenticateUser, requireAuth, async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const userId = req.user.id;

    log('INFO', '切换点赞状态', { templateId, userId }, 333);

    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('nb_user_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .single();

    let isLiked;
    if (existingLike) {
      // 取消点赞
      await supabase
        .from('nb_user_likes')
        .delete()
        .eq('id', existingLike.id);
      isLiked = false;
      log('INFO', '取消点赞成功', { templateId }, 349);
    } else {
      // 添加点赞
      await supabase
        .from('nb_user_likes')
        .insert({
          user_id: userId,
          template_id: templateId
        });
      isLiked = true;
      log('INFO', '添加点赞成功', { templateId }, 358);
    }

    // 获取最新点赞数
    const { data: template } = await supabase
      .from('nb_templates')
      .select('like_count')
      .eq('id', templateId)
      .single();

    res.json({
      success: true,
      data: {
        is_liked: isLiked,
        like_count: template?.like_count || 0
      }
    });

  } catch (error) {
    log('ERROR', '切换点赞状态错误', { error: error.message }, 374);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 收藏/取消收藏
router.post('/templates/:id/favorite', authenticateUser, requireAuth, async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const userId = req.user.id;

    log('INFO', '切换收藏状态', { templateId, userId }, 387);

    // 检查是否已收藏
    const { data: existingFavorite } = await supabase
      .from('nb_user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .single();

    let isFavorited;
    if (existingFavorite) {
      // 取消收藏
      await supabase
        .from('nb_user_favorites')
        .delete()
        .eq('id', existingFavorite.id);
      isFavorited = false;
      log('INFO', '取消收藏成功', { templateId }, 403);
    } else {
      // 添加收藏
      await supabase
        .from('nb_user_favorites')
        .insert({
          user_id: userId,
          template_id: templateId
        });
      isFavorited = true;
      log('INFO', '添加收藏成功', { templateId }, 412);
    }

    res.json({
      success: true,
      data: {
        is_favorited: isFavorited
      }
    });

  } catch (error) {
    log('ERROR', '切换收藏状态错误', { error: error.message }, 422);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 评分
router.post('/templates/:id/rating', authenticateUser, requireAuth, async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    log('INFO', '提交评分', { templateId, userId, rating }, 435);

    // 验证评分范围
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: '评分必须在1-5之间'
      });
    }

    // 插入或更新评分
    const { error } = await supabase
      .from('nb_user_ratings')
      .upsert({
        user_id: userId,
        template_id: templateId,
        rating: parseInt(rating),
        updated_at: new Date().toISOString()
      });

    if (error) {
      log('ERROR', '提交评分失败', { error: error.message }, 453);
      throw error;
    }

    log('INFO', '评分提交成功', { templateId, rating }, 457);

    res.json({
      success: true,
      data: {
        rating: parseInt(rating),
        message: '评分成功'
      }
    });

  } catch (error) {
    log('ERROR', '提交评分错误', { error: error.message }, 467);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取用户收藏列表
router.get('/user/favorites', authenticateUser, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    log('INFO', '获取用户收藏列表', { userId }, 479);

    const offset = (page - 1) * limit;

    const { data: favorites, error, count } = await supabase
      .from('nb_user_favorites')
      .select(`
        *,
        template:nb_templates(
          *,
          author:nb_user_profiles(username, avatar_url),
          category:nb_template_categories(name, name_en)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      log('ERROR', '查询收藏列表失败', { error: error.message }, 496);
      throw error;
    }

    res.json({
      success: true,
      data: {
        favorites: favorites || [],
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + (favorites?.length || 0) < (count || 0)
      }
    });

  } catch (error) {
    log('ERROR', '获取用户收藏列表错误', { error: error.message }, 510);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 记录模板使用
router.post('/templates/:id/use', authenticateUser, requireAuth, async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const userId = req.user.id;

    log('INFO', '记录模板使用', { templateId, userId }, 522);

    // 记录使用日志
    await supabase
      .from('nb_template_usage_logs')
      .insert({
        user_id: userId,
        template_id: templateId,
        action: 'use',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    // 增加下载计数
    await supabase
      .from('nb_templates')
      .update({ download_count: supabase.sql`download_count + 1` })
      .eq('id', templateId);

    log('INFO', '模板使用记录成功', { templateId }, 540);

    res.json({
      success: true,
      data: {
        message: '使用记录成功'
      }
    });

  } catch (error) {
    log('ERROR', '记录模板使用错误', { error: error.message }, 549);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
