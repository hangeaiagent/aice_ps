/**
 * 任务历史记录服务
 * 功能: 管理用户图片生成任务的记录和统计
 */

import { supabase } from '../lib/supabase';

// 任务记录接口
export interface TaskRecord {
  id?: string;
  user_id?: string;
  task_type: 'image_generation' | 'image_edit' | 'template_generation';
  prompt: string;
  original_image_url?: string;
  generated_image_url?: string;
  aws_original_key?: string;
  aws_generated_key?: string;
  tokens_used?: number;
  credits_deducted?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  aspect_ratio?: string;
  model_version?: string;
  generation_time_ms?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

// 任务统计接口
export interface TaskStatistics {
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  total_tokens_used: number;
  total_credits_deducted: number;
  total_generation_time_ms: number;
  success_rate: number;
  avg_generation_time_ms: number;
}

// 分页查询参数
export interface TaskQueryParams {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  task_type?: string;
}

// 分页结果
export interface PaginatedTaskResult {
  tasks: TaskRecord[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_more: boolean;
  };
}

class TaskHistoryService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * 获取认证头部
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('用户未登录');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  /**
   * 创建新的任务记录
   */
  async createTask(taskData: Omit<TaskRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<TaskRecord> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建任务记录失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('创建任务记录失败:', error);
      throw error;
    }
  }

  /**
   * 上传原始图片
   */
  async uploadOriginalImage(taskId: string, imageFile: File): Promise<TaskRecord> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('用户未登录');
      }

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks/${taskId}/original-image`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传原始图片失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('上传原始图片失败:', error);
      throw error;
    }
  }

  /**
   * 完成任务记录
   */
  async completeTask(
    taskId: string, 
    completionData: {
      generated_image_data?: string;
      tokens_used?: number;
      credits_deducted?: number;
      generation_time_ms?: number;
      error_message?: string;
    }
  ): Promise<TaskRecord> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(completionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '完成任务记录失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('完成任务记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务历史列表
   */
  async getTasks(params: TaskQueryParams = {}): Promise<PaginatedTaskResult> {
    try {
      const headers = await this.getAuthHeaders();
      
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks?${queryParams.toString()}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取任务历史失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('获取任务历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务统计信息
   */
  async getStatistics(period: 'daily' | 'weekly' | 'monthly' = 'daily', startDate?: string, endDate?: string): Promise<{
    statistics: any[];
    totals: TaskStatistics;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const queryParams = new URLSearchParams({ period });
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);

      const response = await fetch(`${this.apiBaseUrl}/task-history/statistics?${queryParams.toString()}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取统计信息失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个任务详情
   */
  async getTask(taskId: string): Promise<TaskRecord> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks/${taskId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取任务详情失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      throw error;
    }
  }

  /**
   * 删除任务记录
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.apiBaseUrl}/task-history/tasks/${taskId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除任务失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }

  /**
   * 创建完整的任务记录流程
   * 用于图片生成过程中的自动记录
   */
  async recordImageGeneration(
    prompt: string,
    taskType: 'image_generation' | 'image_edit' | 'template_generation',
    aspectRatio?: string,
    originalImageFile?: File
  ): Promise<{
    taskId: string;
    completeTask: (result: { 
      imageDataUrl?: string; 
      tokensUsed?: number; 
      creditsDeducted?: number; 
      generationTimeMs?: number; 
      error?: string 
    }) => Promise<TaskRecord>;
  }> {
    // 创建任务记录
    const task = await this.createTask({
      task_type: taskType,
      prompt,
      aspect_ratio: aspectRatio,
      model_version: 'gemini-1.5-pro',
      status: 'pending'
    });

    // 如果有原始图片，上传它
    if (originalImageFile) {
      await this.uploadOriginalImage(task.id!, originalImageFile);
    }

    // 返回完成任务的函数
    const completeTask = async (result: { 
      imageDataUrl?: string; 
      tokensUsed?: number; 
      creditsDeducted?: number; 
      generationTimeMs?: number; 
      error?: string 
    }) => {
      return await this.completeTask(task.id!, {
        generated_image_data: result.imageDataUrl,
        tokens_used: result.tokensUsed || 0,
        credits_deducted: result.creditsDeducted || 1,
        generation_time_ms: result.generationTimeMs || 0,
        error_message: result.error
      });
    };

    return {
      taskId: task.id!,
      completeTask
    };
  }
}

export const taskHistoryService = new TaskHistoryService();
