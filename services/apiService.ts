/**
 * API 服务 - 与后端服务器通信
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const USE_SERVER_GENERATION = process.env.VITE_USE_SERVER_GENERATION === 'true';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ImageGenerationResult {
  imageUrl: string;
  filename: string;
}

interface BatchImageResult {
  index: number;
  status: 'done' | 'error';
  url?: string;
  filename?: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;
  private useServerGeneration: boolean;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.useServerGeneration = USE_SERVER_GENERATION;
  }

  // 检查是否使用服务器端生成
  isServerGenerationEnabled(): boolean {
    return this.useServerGeneration;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }

  // 文件上传请求方法
  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('文件上传请求失败:', error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('服务器连接失败');
    }
  }

  // 从文本生成图片
  async generateImageFromText(prompt: string, aspectRatio: string = '1:1'): Promise<ImageGenerationResult> {
    const response = await this.request<ImageGenerationResult>('/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspectRatio }),
    });
    return response;
  }

  // 图片编辑
  async editImage(
    imageFile: File, 
    prompt: string, 
    type: string = 'edit',
    hotspot?: { x: number; y: number }
  ): Promise<ImageGenerationResult> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);
    formData.append('type', type);
    
    if (hotspot) {
      formData.append('hotspot', JSON.stringify(hotspot));
    }

    const response = await this.uploadRequest<ImageGenerationResult>('/edit-image', formData);
    return response;
  }

  // 批量生成图片（用于 BeatSync 功能）
  async generateBatchImages(
    imageFile: File, 
    prompts: string[]
  ): Promise<BatchImageResult[]> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompts', JSON.stringify(prompts));

    const response = await this.uploadRequest<{ images: BatchImageResult[] }>('/generate-batch-images', formData);
    return response.images;
  }

  // 获取创意建议
  async getCreativeSuggestions(
    imageFile: File, 
    type: 'filter' | 'adjustment' | 'texture'
  ): Promise<{ name: string; prompt: string }[]> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('type', type);

    const response = await this.uploadRequest<{ suggestions: { name: string; prompt: string }[] }>('/creative-suggestions', formData);
    return response.suggestions;
  }

  // 具体的图片编辑方法
  async generateEditedImage(imageFile: File, prompt: string, hotspot: { x: number; y: number }): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'edit', hotspot);
  }

  async generateFilteredImage(imageFile: File, prompt: string): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'filter');
  }

  async generateStyledImage(imageFile: File, prompt: string): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'style');
  }

  async generateAdjustedImage(imageFile: File, prompt: string): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'adjustment');
  }

  async generateTexturedImage(imageFile: File, prompt: string): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'texture');
  }

  async removeBackgroundImage(imageFile: File): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, '', 'remove-background');
  }

  async generateFusedImage(mainImage: File, sourceImages: File[], prompt: string): Promise<ImageGenerationResult> {
    const formData = new FormData();
    formData.append('image', mainImage);
    sourceImages.forEach((file, index) => {
      formData.append(`sourceImage${index}`, file);
    });
    formData.append('prompt', prompt);
    formData.append('type', 'fusion');

    const response = await this.uploadRequest<ImageGenerationResult>('/edit-image', formData);
    return response;
  }

  async generateDecadeImage(imageFile: File, prompt: string): Promise<ImageGenerationResult> {
    return this.editImage(imageFile, prompt, 'decade');
  }
}

export const apiService = new ApiService();
export type { ImageGenerationResult, BatchImageResult };