/**
 * Google Imagen 服务 - 用于生成漫画风格图像
 * 支持文本到图像生成、风格控制、批量生成等功能
 */

export interface ImageGenerationOptions {
  prompt: string;
  style?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:4' | '9:16';
  quality?: 'draft' | 'standard' | 'high';
  safetyLevel?: 'low' | 'medium' | 'high';
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  generatedAt: Date;
  metadata?: any;
}

export interface GoogleImagenConfig {
  apiKey: string;
  projectId: string;
  location?: string;
  model?: string;
}

class GoogleImagenService {
  private apiKey: string;
  private projectId: string;
  private location: string;
  private model: string;
  private baseUrl: string;

  constructor(config: GoogleImagenConfig) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.location = config.location || 'us-central1';
    this.model = config.model || 'imagen-3.0-generate-001';
    this.baseUrl = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}`;
  }

  /**
   * 生成单张漫画图像
   */
  async generateComicImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const enhancedPrompt = this.enhancePromptForComic(options.prompt, options.style);
    
    try {
      const response = await this.callImagenAPI(enhancedPrompt, options);
      return this.processImageResponse(response, options);
    } catch (error) {
      console.error('Google Imagen API调用失败:', error);
      throw new Error(`图像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量生成漫画图像
   */
  async generateComicSeries(prompts: string[], options?: Partial<ImageGenerationOptions>): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    const defaultOptions = {
      style: '儿童漫画风格',
      aspectRatio: '4:3' as const,
      quality: 'standard' as const,
      ...options
    };

    // 控制并发数量，避免API限制
    const batchSize = 3;
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (prompt, index) => {
        try {
          // 添加延迟避免频率限制
          if (index > 0) {
            await this.delay(1000 * index);
          }
          
          return await this.generateComicImage({
            ...defaultOptions,
            prompt,
          });
        } catch (error) {
          console.error(`生成第${i + index + 1}张图像失败:`, error);
          // 返回错误占位符
          return this.createErrorPlaceholder(prompt, error as Error);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 为漫画优化提示词
   */
  private enhancePromptForComic(prompt: string, style: string = '儿童漫画风格'): string {
    const baseEnhancements = [
      'high quality illustration',
      'clean lines',
      'bright colors',
      'child-friendly',
      'cartoon style',
      'comic book art'
    ];

    const styleMap: { [key: string]: string[] } = {
      '儿童漫画风格': ['children book illustration', 'cute characters', 'soft shading', 'warm lighting'],
      '卡通风格': ['cartoon illustration', 'vibrant colors', 'simple shapes', 'expressive characters'],
      '日式漫画': ['manga style', 'anime characters', 'detailed expressions', 'dynamic poses'],
      '美式漫画': ['comic book style', 'bold outlines', 'dramatic lighting', 'superhero aesthetic'],
      '水彩风格': ['watercolor illustration', 'soft edges', 'flowing colors', 'artistic brushstrokes']
    };

    const styleEnhancements = styleMap[style] || styleMap['儿童漫画风格'];
    const allEnhancements = [...baseEnhancements, ...styleEnhancements];

    return `${prompt}, ${allEnhancements.join(', ')}, no text, no words, no letters`;
  }

  /**
   * 调用Google Imagen API
   */
  private async callImagenAPI(prompt: string, options: ImageGenerationOptions): Promise<any> {
    const requestBody = {
      instances: [
        {
          prompt: prompt,
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: options.aspectRatio || '4:3',
        safetyFilterLevel: this.mapSafetyLevel(options.safetyLevel || 'medium'),
        personGeneration: 'allow_adult',
        ...(options.seed && { seed: options.seed })
      }
    };

    const response = await fetch(`${this.baseUrl}:predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Imagen API错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 在实际实现中，这里应该使用Google Cloud认证
    // 这里返回API密钥作为简化实现
    return this.apiKey;
  }

  /**
   * 处理图像响应
   */
  private processImageResponse(response: any, options: ImageGenerationOptions): GeneratedImage {
    if (!response.predictions || !response.predictions[0]) {
      throw new Error('图像生成响应格式错误');
    }

    const prediction = response.predictions[0];
    
    // Google Imagen返回base64编码的图像
    if (prediction.bytesBase64Encoded) {
      const base64Image = prediction.bytesBase64Encoded;
      const imageUrl = `data:image/png;base64,${base64Image}`;
      
      return {
        url: imageUrl,
        prompt: options.prompt,
        style: options.style || '儿童漫画风格',
        aspectRatio: options.aspectRatio || '4:3',
        generatedAt: new Date(),
        metadata: {
          model: this.model,
          safetyLevel: options.safetyLevel,
          seed: options.seed
        }
      };
    }

    throw new Error('未找到生成的图像数据');
  }

  /**
   * 映射安全级别
   */
  private mapSafetyLevel(level: string): string {
    const mapping: { [key: string]: string } = {
      'low': 'BLOCK_ONLY_HIGH',
      'medium': 'BLOCK_MEDIUM_AND_ABOVE',
      'high': 'BLOCK_LOW_AND_ABOVE'
    };
    return mapping[level] || 'BLOCK_MEDIUM_AND_ABOVE';
  }

  /**
   * 创建错误占位符图像
   */
  private createErrorPlaceholder(prompt: string, error: Error): GeneratedImage {
    // 创建一个简单的错误占位符
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // 绘制错误占位符
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 300);
      
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('图像生成失败', 200, 140);
      ctx.fillText('请稍后重试', 200, 160);
    }

    return {
      url: canvas.toDataURL(),
      prompt,
      style: '错误占位符',
      aspectRatio: '4:3',
      generatedAt: new Date(),
      metadata: {
        error: error.message,
        isPlaceholder: true
      }
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证配置
   */
  validateConfig(): boolean {
    return !!(this.apiKey && this.projectId);
  }

  /**
   * 获取支持的风格列表
   */
  getSupportedStyles(): string[] {
    return [
      '儿童漫画风格',
      '卡通风格',
      '日式漫画',
      '美式漫画',
      '水彩风格'
    ];
  }

  /**
   * 获取支持的宽高比列表
   */
  getSupportedAspectRatios(): string[] {
    return ['1:1', '4:3', '16:9', '3:4', '9:16'];
  }
}

// Fallback服务 - 当Google Imagen不可用时使用
class FallbackImageService {
  /**
   * 生成占位符图像
   */
  async generatePlaceholderImage(prompt: string, options?: Partial<ImageGenerationOptions>): Promise<GeneratedImage> {
    const canvas = document.createElement('canvas');
    const aspectRatio = options?.aspectRatio || '4:3';
    
    // 根据宽高比设置画布尺寸
    const dimensions = this.getCanvasDimensions(aspectRatio);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建画布上下文');
    }

    // 绘制占位符
    this.drawPlaceholder(ctx, canvas.width, canvas.height, prompt);

    return {
      url: canvas.toDataURL(),
      prompt,
      style: options?.style || '占位符',
      aspectRatio,
      generatedAt: new Date(),
      metadata: {
        isFallback: true
      }
    };
  }

  private getCanvasDimensions(aspectRatio: string): { width: number; height: number } {
    const ratioMap: { [key: string]: { width: number; height: number } } = {
      '1:1': { width: 400, height: 400 },
      '4:3': { width: 400, height: 300 },
      '16:9': { width: 400, height: 225 },
      '3:4': { width: 300, height: 400 },
      '9:16': { width: 225, height: 400 }
    };
    return ratioMap[aspectRatio] || ratioMap['4:3'];
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): void {
    // 背景
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, 0, width, height);

    // 边框
    ctx.strokeStyle = '#b0d4e3';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 标题
    ctx.fillStyle = '#2c5aa0';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('漫画场景', width / 2, 40);

    // 提示文本
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    const words = prompt.split(' ');
    let line = '';
    let y = height / 2 - 20;
    
    for (let i = 0; i < words.length && y < height - 40; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > width - 40 && i > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[i] + ' ';
        y += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);

    // 装饰元素
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(50, 50, 15, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(width - 50, 50, 12, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// 导出服务实例创建函数
export const createGoogleImagenService = (config: GoogleImagenConfig): GoogleImagenService => {
  return new GoogleImagenService(config);
};

export const createFallbackImageService = (): FallbackImageService => {
  return new FallbackImageService();
};

// 导出默认配置
export const getDefaultImagenConfig = (): Partial<GoogleImagenConfig> => ({
  location: 'us-central1',
  model: 'imagen-3.0-generate-001'
});

export default GoogleImagenService;