// NB提示词模板库 - 前端服务
import { supabase } from '../lib/supabase';

// 类型定义（与App.tsx中的Template接口兼容）
export interface Template {
  id: string;
  // 兼容旧字段
  name?: string;
  iconUrl?: string;
  baseUrl?: string;
  // 新字段
  title?: string;
  cover_image_url?: string;
  example_images?: string[];
  description: string;
  prompt: string;
  // 扩展字段
  author?: {
    id: string;
    username: string;
    avatar_url: string;
    is_creator?: boolean;
    creator_level?: number;
  };
  category?: {
    id: string;
    name: string;
    name_en?: string;
    description?: string;
  };
  tags?: Tag[];
  difficulty_level?: number;
  estimated_time?: number;
  status?: string;
  is_featured?: boolean;
  is_premium?: boolean;
  stats?: {
    view_count: number;
    download_count: number;
    like_count: number;
    comment_count: number;
    rating_avg: number;
    rating_count: number;
  };
  user_interaction?: {
    is_liked: boolean;
    is_favorited: boolean;
    user_rating?: number;
  };
  version?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  usage_count?: number;
}

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  icon_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface TemplateQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  search?: string;
  sort?: 'popular' | 'latest' | 'rating' | 'downloads';
  author?: string;
  featured?: boolean;
  premium?: boolean;
}

export interface TemplateListResponse {
  templates: Template[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 获取认证头
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return headers;
};

// API请求封装
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// 模板服务类
export class TemplateService {
  // 将数据库模板数据映射到前端接口
  private static mapTemplateFromDB(dbTemplate: any): Template {
    return {
      id: dbTemplate.id,
      // 兼容旧字段
      name: dbTemplate.title,
      iconUrl: dbTemplate.cover_image_url,
      baseUrl: dbTemplate.example_images?.[0],
      // 新字段
      title: dbTemplate.title,
      cover_image_url: dbTemplate.cover_image_url,
      example_images: dbTemplate.example_images || [],
      description: dbTemplate.description || '',
      prompt: dbTemplate.prompt || '',
      // 扩展字段
      author: dbTemplate.author ? {
        id: dbTemplate.author_id,
        username: dbTemplate.author.username || 'Unknown',
        avatar_url: dbTemplate.author.avatar_url || '',
        is_creator: dbTemplate.author.is_creator,
        creator_level: dbTemplate.author.creator_level
      } : undefined,
      category: dbTemplate.category ? {
        id: dbTemplate.category_id,
        name: dbTemplate.category.name || '',
        name_en: dbTemplate.category.name_en,
        description: dbTemplate.category.description
      } : undefined,
      tags: dbTemplate.tags?.map((tagRel: any) => ({
        id: tagRel.nb_template_tags.id,
        name: tagRel.nb_template_tags.name,
        color: tagRel.nb_template_tags.color,
        usage_count: tagRel.nb_template_tags.usage_count
      })) || [],
      difficulty_level: dbTemplate.difficulty_level || 1,
      estimated_time: dbTemplate.estimated_time,
      status: dbTemplate.status || 'published',
      is_featured: dbTemplate.is_featured || false,
      is_premium: dbTemplate.is_premium || false,
      stats: {
        view_count: dbTemplate.view_count || 0,
        download_count: dbTemplate.download_count || 0,
        like_count: dbTemplate.like_count || 0,
        comment_count: dbTemplate.comment_count || 0,
        rating_avg: parseFloat(dbTemplate.rating_avg) || 0,
        rating_count: dbTemplate.rating_count || 0
      },
      user_interaction: dbTemplate.user_interaction,
      version: dbTemplate.version || '1.0',
      created_at: dbTemplate.created_at,
      updated_at: dbTemplate.updated_at,
      published_at: dbTemplate.published_at
    };
  }
  // 获取模板列表
  static async getTemplates(params: TemplateQueryParams = {}): Promise<TemplateListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const response = await apiRequest(`/templates?${searchParams.toString()}`);
    
    // 映射数据库字段到前端接口
    const mappedTemplates = response.data.templates.map(this.mapTemplateFromDB);
    
    return {
      ...response.data,
      templates: mappedTemplates
    };
  }

  // 获取模板详情
  static async getTemplate(id: string): Promise<Template> {
    const response = await apiRequest(`/templates/${id}`);
    return this.mapTemplateFromDB(response.data.template);
  }

  // 获取分类列表
  static async getCategories(): Promise<Category[]> {
    const response = await apiRequest('/categories');
    return response.data.categories;
  }

  // 获取标签列表
  static async getTags(): Promise<Tag[]> {
    const response = await apiRequest('/tags');
    return response.data.tags;
  }

  // 点赞/取消点赞
  static async toggleLike(templateId: string): Promise<{ is_liked: boolean; like_count: number }> {
    const response = await apiRequest(`/templates/${templateId}/like`, {
      method: 'POST',
    });
    return response.data;
  }

  // 收藏/取消收藏
  static async toggleFavorite(templateId: string): Promise<{ is_favorited: boolean }> {
    const response = await apiRequest(`/templates/${templateId}/favorite`, {
      method: 'POST',
    });
    return response.data;
  }

  // 评分
  static async rateTemplate(templateId: string, rating: number): Promise<{ rating: number; message: string }> {
    const response = await apiRequest(`/templates/${templateId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
    return response.data;
  }

  // 获取用户收藏列表
  static async getUserFavorites(page = 1, limit = 20): Promise<TemplateListResponse> {
    const response = await apiRequest(`/user/favorites?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 记录模板使用
  static async recordTemplateUse(templateId: string): Promise<void> {
    await apiRequest(`/templates/${templateId}/use`, {
      method: 'POST',
    });
  }

  // 搜索模板（客户端搜索，用于兼容现有代码）
  static async searchTemplates(query: string): Promise<Template[]> {
    const response = await this.getTemplates({
      search: query,
      limit: 50 // 搜索时获取更多结果
    });
    return response.templates;
  }

  // 按分类获取模板
  static async getTemplatesByCategory(categoryId: string, limit = 20): Promise<Template[]> {
    const response = await this.getTemplates({
      category: categoryId,
      limit
    });
    return response.templates;
  }

  // 获取热门模板
  static async getPopularTemplates(limit = 10): Promise<Template[]> {
    const response = await this.getTemplates({
      sort: 'popular',
      limit
    });
    return response.templates;
  }

  // 获取最新模板
  static async getLatestTemplates(limit = 10): Promise<Template[]> {
    const response = await this.getTemplates({
      sort: 'latest',
      limit
    });
    return response.templates;
  }

  // 获取特色模板
  static async getFeaturedTemplates(limit = 10): Promise<Template[]> {
    const response = await this.getTemplates({
      featured: true,
      limit
    });
    return response.templates;
  }
}

// 兼容现有代码的函数导出
export const templateService = TemplateService;

// 默认导出
export default TemplateService;
