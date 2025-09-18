/**
 * 混合图片服务 - 根据配置选择使用本地 Gemini 服务或后端服务
 * 集成权限验证和积分管理
 */

import * as geminiService from './geminiService';
import { apiService, ImageGenerationResult, BatchImageResult } from './apiService';
import { permissionService, FeatureType } from './permissionService';
import { taskHistoryService } from './taskHistoryService';
import { supabase } from '../lib/supabase';

// 检查是否应该使用服务器端生成
const shouldUseServerGeneration = (): boolean => {
  // 优先检查环境变量
  const envSetting = import.meta.env.VITE_USE_SERVER_GENERATION;
  if (envSetting !== undefined) {
    return envSetting === 'true';
  }
  
  // 检查 localStorage 设置
  try {
    const localSetting = localStorage.getItem('use-server-generation');
    if (localSetting !== null) {
      return localSetting === 'true';
    }
  } catch (e) {
    console.warn('无法访问 localStorage');
  }
  
  // 默认使用本地生成
  return false;
};

// 将后端返回的结果转换为前端期望的格式
const convertApiResultToDataUrl = async (result: ImageGenerationResult): Promise<string> => {
  try {
    // 如果返回的是完整的 URL，直接返回
    if (result.imageUrl.startsWith('http') || result.imageUrl.startsWith('data:')) {
      return result.imageUrl;
    }
    
    // 如果是相对路径，转换为完整 URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
    return `${baseUrl}${result.imageUrl}`;
  } catch (error) {
    console.error('转换图片 URL 失败:', error);
    throw error;
  }
};

// 权限检查结果接口
interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
}

// 混合服务类
class HybridImageService {
  /**
   * 检查用户权限并消费积分
   */
  private async checkPermissionAndConsumeCredits(
    featureType: FeatureType, 
    resourceData?: any
  ): Promise<PermissionCheckResult> {
    try {
      // 获取当前用户
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return {
          allowed: false,
          reason: 'not_authenticated',
          message: '请先登录后使用该功能'
        };
      }

      // 检查权限
      const permissionCheck = await permissionService.checkFeaturePermission(user, featureType, resourceData);
      
      if (!permissionCheck.allowed) {
        return {
          allowed: false,
          reason: permissionCheck.reason,
          message: permissionCheck.message
        };
      }

      // 消费积分
      const consumeResult = await permissionService.consumeCredits(user, featureType, resourceData);
      
      if (!consumeResult.success) {
        return {
          allowed: false,
          reason: consumeResult.reason,
          message: consumeResult.message
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('权限检查失败:', error);
      return {
        allowed: false,
        reason: 'permission_check_failed',
        message: '权限检查失败，请稍后重试'
      };
    }
  }
  // 从文本生成图片
  async generateImageFromText(prompt: string, aspectRatio: string = '1:1'): Promise<string> {
    const startTime = Date.now();
    let taskRecord: { taskId: string; completeTask: any } | null = null;

    try {
      // 权限检查和积分消费
      const permissionCheck = await this.checkPermissionAndConsumeCredits('nano_banana', { aspectRatio });
      
      if (!permissionCheck.allowed) {
        throw new Error(permissionCheck.message || '权限不足');
      }

      // 创建任务记录
      try {
        taskRecord = await taskHistoryService.recordImageGeneration(
          prompt,
          'image_generation',
          aspectRatio
        );
      } catch (recordError) {
        console.warn('创建任务记录失败，继续执行图片生成:', recordError);
      }

      let imageDataUrl: string;

      if (shouldUseServerGeneration()) {
        try {
          const result = await apiService.generateImageFromText(prompt, aspectRatio);
          imageDataUrl = await convertApiResultToDataUrl(result);
        } catch (error) {
          console.warn('服务器端生成失败，回退到本地生成:', error);
          imageDataUrl = await geminiService.generateImageFromText(prompt, aspectRatio);
        }
      } else {
        imageDataUrl = await geminiService.generateImageFromText(prompt, aspectRatio);
      }

      // 完成任务记录
      if (taskRecord) {
        try {
          await taskRecord.completeTask({
            imageDataUrl,
            tokensUsed: this.estimateTokenUsage(prompt),
            creditsDeducted: 1,
            generationTimeMs: Date.now() - startTime
          });
        } catch (recordError) {
          console.warn('完成任务记录失败:', recordError);
        }
      }

      return imageDataUrl;

    } catch (error) {
      // 记录失败的任务
      if (taskRecord) {
        try {
          await taskRecord.completeTask({
            tokensUsed: this.estimateTokenUsage(prompt),
            creditsDeducted: 1,
            generationTimeMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : '图片生成失败'
          });
        } catch (recordError) {
          console.warn('记录失败任务失败:', recordError);
        }
      }
      throw error;
    }
  }

  // 估算token使用量
  private estimateTokenUsage(prompt: string): number {
    // 简单的token估算：大约每4个字符1个token
    return Math.ceil(prompt.length / 4);
  }

  // 生成编辑后的图片
  async generateEditedImage(imageFile: File, prompt: string, hotspot: { x: number; y: number }): Promise<string> {
    const startTime = Date.now();
    let taskRecord: { taskId: string; completeTask: any } | null = null;

    try {
      // 权限检查和积分消费
      const permissionCheck = await this.checkPermissionAndConsumeCredits('nano_banana', { type: 'edit' });
      
      if (!permissionCheck.allowed) {
        throw new Error(permissionCheck.message || '权限不足');
      }

      // 创建任务记录
      try {
        taskRecord = await taskHistoryService.recordImageGeneration(
          prompt,
          'image_edit',
          undefined,
          imageFile
        );
      } catch (recordError) {
        console.warn('创建任务记录失败，继续执行图片编辑:', recordError);
      }

      let imageDataUrl: string;

      if (shouldUseServerGeneration()) {
        try {
          const result = await apiService.generateEditedImage(imageFile, prompt, hotspot);
          imageDataUrl = await convertApiResultToDataUrl(result);
        } catch (error) {
          console.warn('服务器端编辑失败，回退到本地编辑:', error);
          imageDataUrl = await geminiService.generateEditedImage(imageFile, prompt, hotspot);
        }
      } else {
        imageDataUrl = await geminiService.generateEditedImage(imageFile, prompt, hotspot);
      }

      // 完成任务记录
      if (taskRecord) {
        try {
          await taskRecord.completeTask({
            imageDataUrl,
            tokensUsed: this.estimateTokenUsage(prompt),
            creditsDeducted: 1,
            generationTimeMs: Date.now() - startTime
          });
        } catch (recordError) {
          console.warn('完成任务记录失败:', recordError);
        }
      }

      return imageDataUrl;

    } catch (error) {
      // 记录失败的任务
      if (taskRecord) {
        try {
          await taskRecord.completeTask({
            tokensUsed: this.estimateTokenUsage(prompt),
            creditsDeducted: 1,
            generationTimeMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : '图片编辑失败'
          });
        } catch (recordError) {
          console.warn('记录失败任务失败:', recordError);
        }
      }
      throw error;
    }
  }

  // 生成滤镜效果图片
  async generateFilteredImage(imageFile: File, prompt: string): Promise<string> {
    // 权限检查和积分消费
    const permissionCheck = await this.checkPermissionAndConsumeCredits('nano_banana', { type: 'filter' });
    
    if (!permissionCheck.allowed) {
      throw new Error(permissionCheck.message || '权限不足');
    }

    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.generateFilteredImage(imageFile, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端滤镜失败，回退到本地滤镜:', error);
        return await geminiService.generateFilteredImage(imageFile, prompt);
      }
    } else {
      return await geminiService.generateFilteredImage(imageFile, prompt);
    }
  }

  // 生成风格化图片
  async generateStyledImage(imageFile: File, prompt: string): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.generateStyledImage(imageFile, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端风格化失败，回退到本地风格化:', error);
        return await geminiService.generateStyledImage(imageFile, prompt);
      }
    } else {
      return await geminiService.generateStyledImage(imageFile, prompt);
    }
  }

  // 生成调整后的图片
  async generateAdjustedImage(imageFile: File, prompt: string): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.generateAdjustedImage(imageFile, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端调整失败，回退到本地调整:', error);
        return await geminiService.generateAdjustedImage(imageFile, prompt);
      }
    } else {
      return await geminiService.generateAdjustedImage(imageFile, prompt);
    }
  }

  // 生成纹理效果图片
  async generateTexturedImage(imageFile: File, prompt: string): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.generateTexturedImage(imageFile, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端纹理失败，回退到本地纹理:', error);
        return await geminiService.generateTexturedImage(imageFile, prompt);
      }
    } else {
      return await geminiService.generateTexturedImage(imageFile, prompt);
    }
  }

  // 移除背景
  async removeBackgroundImage(imageFile: File): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.removeBackgroundImage(imageFile);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端抠图失败，回退到本地抠图:', error);
        return await geminiService.removeBackgroundImage(imageFile);
      }
    } else {
      return await geminiService.removeBackgroundImage(imageFile);
    }
  }

  // 生成融合图片
  async generateFusedImage(mainImage: File, sourceImages: File[], prompt: string): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        const result = await apiService.generateFusedImage(mainImage, sourceImages, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端融合失败，回退到本地融合:', error);
        return await geminiService.generateFusedImage(mainImage, sourceImages, prompt);
      }
    } else {
      return await geminiService.generateFusedImage(mainImage, sourceImages, prompt);
    }
  }

  // 生成年代风格图片
  async generateDecadeImage(imageDataUrl: string, prompt: string): Promise<string> {
    if (shouldUseServerGeneration()) {
      try {
        // 将 data URL 转换为 File 对象
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: blob.type });
        
        const result = await apiService.generateDecadeImage(file, prompt);
        return await convertApiResultToDataUrl(result);
      } catch (error) {
        console.warn('服务器端年代风格失败，回退到本地生成:', error);
        return await geminiService.generateDecadeImage(imageDataUrl, prompt);
      }
    } else {
      return await geminiService.generateDecadeImage(imageDataUrl, prompt);
    }
  }

  // 批量生成风格化图片（用于 BeatSync）
  async generateBatchStyledImages(imageFile: File, prompts: string[]): Promise<BatchImageResult[]> {
    if (shouldUseServerGeneration()) {
      try {
        return await apiService.generateBatchImages(imageFile, prompts);
      } catch (error) {
        console.warn('服务器端批量生成失败，回退到本地生成:', error);
        // 本地批量生成的回退实现
        return await this.generateBatchStyledImagesLocally(imageFile, prompts);
      }
    } else {
      return await this.generateBatchStyledImagesLocally(imageFile, prompts);
    }
  }

  // 本地批量生成实现
  private async generateBatchStyledImagesLocally(imageFile: File, prompts: string[]): Promise<BatchImageResult[]> {
    const results: BatchImageResult[] = [];
    const concurrency = 3;
    
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchPromises = batch.map(async (prompt, index) => {
        try {
          const url = await geminiService.generateStyledImage(imageFile, prompt);
          return { 
            index: i + index, 
            status: 'done' as const, 
            url,
            filename: `image_${i + index}.png`
          };
        } catch (error) {
          console.error(`生成第 ${i + index} 张图片失败:`, error);
          return { 
            index: i + index, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  // 获取创意建议
  async generateCreativeSuggestions(imageFile: File, type: 'filter' | 'adjustment' | 'texture'): Promise<{ name: string; prompt: string }[]> {
    if (shouldUseServerGeneration()) {
      try {
        return await apiService.getCreativeSuggestions(imageFile, type);
      } catch (error) {
        console.warn('服务器端创意建议失败，回退到本地生成:', error);
        return await geminiService.generateCreativeSuggestions(imageFile, type);
      }
    } else {
      return await geminiService.generateCreativeSuggestions(imageFile, type);
    }
  }

  // 检查服务器状态
  async checkServerStatus(): Promise<boolean> {
    try {
      await apiService.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  // 获取当前使用的服务类型
  getCurrentServiceType(): 'server' | 'local' {
    return shouldUseServerGeneration() ? 'server' : 'local';
  }

  // 设置使用服务器端生成
  setUseServerGeneration(useServer: boolean): void {
    try {
      localStorage.setItem('use-server-generation', useServer.toString());
    } catch (e) {
      console.warn('无法保存服务器生成设置到 localStorage');
    }
  }
}

export const hybridImageService = new HybridImageService();