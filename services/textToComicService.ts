/**
 * 文本转漫画服务 - 核心业务逻辑
 * 整合DeepSeek LLM和Google Imagen，实现完整的文本到漫画转换流程
 */

import { supabase } from '../lib/supabase';
import { createDeepSeekService, type ExtractedPlot, type PlotElement } from './deepseekService';
import { createGoogleImagenService, createFallbackImageService, type GeneratedImage, type ImageGenerationOptions } from './googleImagenService';

export interface ComicProject {
  id: string;
  userId: string;
  title: string;
  originalText: string;
  extractedPlot?: ExtractedPlot;
  status: 'created' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  settings: ComicSettings;
}

export interface ComicSettings {
  style: string;
  fontFamily: string;
  fontSize: number;
  targetAge: string;
  aspectRatio: '1:1' | '4:3' | '16:9' | '3:4' | '9:16';
  maxScenes: number;
  useDyslexicFont: boolean;
}

export interface ComicPage {
  id: string;
  projectId: string;
  pageNumber: number;
  sceneDescription: string;
  dialogue: string;
  imageUrl?: string;
  imagePrompt?: string;
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed';
  textBoxes: ComicTextBox[];
}

export interface ComicTextBox {
  id: string;
  pageId: string;
  textContent: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  boxType: 'dialogue' | 'narration' | 'thought';
}

export interface ProcessingProgress {
  step: string;
  progress: number;
  message: string;
  totalSteps: number;
  currentStep: number;
}

class TextToComicService {
  private deepSeekService: any;
  private imagenService: any;
  private fallbackService: any;

  constructor(
    deepSeekApiKey: string,
    googleConfig: { apiKey: string; projectId: string }
  ) {
    this.deepSeekService = createDeepSeekService({
      apiKey: deepSeekApiKey
    });
    
    this.imagenService = createGoogleImagenService({
      apiKey: googleConfig.apiKey,
      projectId: googleConfig.projectId
    });
    
    this.fallbackService = createFallbackImageService();
  }

  /**
   * 创建新的漫画项目
   */
  async createProject(
    userId: string,
    title: string,
    originalText: string,
    settings: Partial<ComicSettings> = {}
  ): Promise<ComicProject> {
    const defaultSettings: ComicSettings = {
      style: '儿童漫画风格',
      fontFamily: 'OpenDyslexic',
      fontSize: 16,
      targetAge: '6-12岁',
      aspectRatio: '4:3',
      maxScenes: 6,
      useDyslexicFont: true,
      ...settings
    };

    const { data, error } = await supabase
      .from('comic_projects')
      .insert({
        user_id: userId,
        title,
        original_text: originalText,
        status: 'created',
        settings: defaultSettings
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建项目失败: ${error.message}`);
    }

    return this.mapDatabaseProject(data);
  }

  /**
   * 处理文本转漫画的完整流程
   */
  async processTextToComic(
    projectId: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ComicProject> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    try {
      // 更新状态为处理中
      await this.updateProjectStatus(projectId, 'processing');

      // 步骤1: 提取关键情节
      onProgress?.({
        step: '提取关键情节',
        progress: 10,
        message: '正在分析文本内容...',
        totalSteps: 4,
        currentStep: 1
      });

      const extractedPlot = await this.extractPlot(project);
      await this.saveExtractedPlot(projectId, extractedPlot);

      // 步骤2: 创建漫画页面
      onProgress?.({
        step: '创建页面结构',
        progress: 30,
        message: '正在创建漫画页面...',
        totalSteps: 4,
        currentStep: 2
      });

      const pages = await this.createComicPages(projectId, extractedPlot, project.settings);

      // 步骤3: 生成图像
      onProgress?.({
        step: '生成漫画图像',
        progress: 50,
        message: '正在生成漫画图像...',
        totalSteps: 4,
        currentStep: 3
      });

      await this.generateImages(pages, project.settings, (imageProgress) => {
        onProgress?.({
          step: '生成漫画图像',
          progress: 50 + (imageProgress * 40 / 100),
          message: `正在生成第${Math.floor(imageProgress / 100 * pages.length) + 1}/${pages.length}张图像...`,
          totalSteps: 4,
          currentStep: 3
        });
      });

      // 步骤4: 添加文本框
      onProgress?.({
        step: '添加文字内容',
        progress: 90,
        message: '正在添加文字内容...',
        totalSteps: 4,
        currentStep: 4
      });

      await this.addTextBoxes(pages, project.settings);

      // 完成
      await this.updateProjectStatus(projectId, 'completed');
      
      onProgress?.({
        step: '完成',
        progress: 100,
        message: '漫画生成完成！',
        totalSteps: 4,
        currentStep: 4
      });

      return await this.getProject(projectId) as ComicProject;

    } catch (error) {
      await this.updateProjectStatus(projectId, 'failed');
      await this.logProcessingError(projectId, 'process_text_to_comic', error as Error);
      throw error;
    }
  }

  /**
   * 提取文本关键情节
   */
  private async extractPlot(project: ComicProject): Promise<ExtractedPlot> {
    await this.logProcessingStep(project.id, 'text_analysis', 'started');
    
    try {
      const startTime = Date.now();
      
      const extractedPlot = await this.deepSeekService.extractPlot(
        project.originalText,
        {
          maxScenes: project.settings.maxScenes,
          targetAge: project.settings.targetAge,
          style: project.settings.style
        }
      );

      const processingTime = Date.now() - startTime;
      await this.logProcessingStep(project.id, 'text_analysis', 'completed', '情节提取成功', processingTime);
      
      return extractedPlot;
    } catch (error) {
      await this.logProcessingStep(project.id, 'text_analysis', 'failed', (error as Error).message);
      throw error;
    }
  }

  /**
   * 保存提取的情节
   */
  private async saveExtractedPlot(projectId: string, plot: ExtractedPlot): Promise<void> {
    const { error } = await supabase
      .from('comic_projects')
      .update({
        extracted_plot: plot,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      throw new Error(`保存情节失败: ${error.message}`);
    }
  }

  /**
   * 创建漫画页面
   */
  private async createComicPages(
    projectId: string,
    plot: ExtractedPlot,
    settings: ComicSettings
  ): Promise<ComicPage[]> {
    const pages: ComicPage[] = [];

    for (let i = 0; i < plot.scenes.length; i++) {
      const scene = plot.scenes[i];
      
      // 生成图像描述
      const imagePrompt = await this.deepSeekService.generateImageDescription(scene, settings.style);
      
      const { data, error } = await supabase
        .from('comic_pages')
        .insert({
          project_id: projectId,
          page_number: i + 1,
          scene_description: scene.description,
          dialogue: scene.dialogue.join('\n'),
          image_prompt: imagePrompt,
          generation_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`创建页面失败: ${error.message}`);
      }

      pages.push(this.mapDatabasePage(data));
    }

    return pages;
  }

  /**
   * 生成图像
   */
  private async generateImages(
    pages: ComicPage[],
    settings: ComicSettings,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      try {
        // 更新页面状态
        await this.updatePageStatus(page.id, 'generating');

        // 生成图像
        const imageOptions: ImageGenerationOptions = {
          prompt: page.imagePrompt || page.sceneDescription,
          style: settings.style,
          aspectRatio: settings.aspectRatio,
          quality: 'standard'
        };

        let generatedImage: GeneratedImage;
        
        try {
          // 尝试使用Google Imagen
          generatedImage = await this.imagenService.generateComicImage(imageOptions);
        } catch (error) {
          console.warn('Google Imagen失败，使用fallback服务:', error);
          // 使用fallback服务
          generatedImage = await this.fallbackService.generatePlaceholderImage(
            imageOptions.prompt,
            imageOptions
          );
        }

        // 保存图像URL
        await this.updatePageImage(page.id, generatedImage.url);
        await this.updatePageStatus(page.id, 'completed');

        // 更新进度
        const progress = ((i + 1) / pages.length) * 100;
        onProgress?.(progress);

      } catch (error) {
        console.error(`生成第${i + 1}页图像失败:`, error);
        await this.updatePageStatus(page.id, 'failed');
        // 继续处理下一页，不中断整个流程
      }
    }
  }

  /**
   * 添加文本框
   */
  private async addTextBoxes(pages: ComicPage[], settings: ComicSettings): Promise<void> {
    for (const page of pages) {
      if (page.dialogue) {
        const dialogues = page.dialogue.split('\n').filter(d => d.trim());
        
        for (let i = 0; i < dialogues.length; i++) {
          const dialogue = dialogues[i].trim();
          if (!dialogue) continue;

          // 计算文本框位置（简单布局算法）
          const position = this.calculateTextBoxPosition(i, dialogues.length);

          const { error } = await supabase
            .from('comic_text_boxes')
            .insert({
              page_id: page.id,
              text_content: dialogue,
              position_x: position.x,
              position_y: position.y,
              width: position.width,
              height: position.height,
              font_family: settings.useDyslexicFont ? 'OpenDyslexic' : settings.fontFamily,
              font_size: settings.fontSize,
              text_color: '#000000',
              background_color: '#FFFFFF',
              box_type: 'dialogue'
            });

          if (error) {
            console.error('创建文本框失败:', error);
          }
        }
      }
    }
  }

  /**
   * 计算文本框位置
   */
  private calculateTextBoxPosition(index: number, total: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    // 简单的布局算法：将文本框分布在图像底部
    const baseY = 200; // 基础Y位置
    const spacing = 60; // 间距
    const boxWidth = 150;
    const boxHeight = 40;

    return {
      x: 50 + (index * 120) % 300, // X位置，避免重叠
      y: baseY + Math.floor(index / 3) * spacing, // Y位置，多行排列
      width: boxWidth,
      height: boxHeight
    };
  }

  /**
   * 获取项目
   */
  async getProject(projectId: string): Promise<ComicProject | null> {
    const { data, error } = await supabase
      .from('comic_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDatabaseProject(data);
  }

  /**
   * 获取项目页面
   */
  async getProjectPages(projectId: string): Promise<ComicPage[]> {
    const { data, error } = await supabase
      .from('comic_pages')
      .select(`
        *,
        comic_text_boxes (*)
      `)
      .eq('project_id', projectId)
      .order('page_number');

    if (error) {
      throw new Error(`获取页面失败: ${error.message}`);
    }

    return data.map(page => this.mapDatabasePage(page));
  }

  /**
   * 获取用户项目列表
   */
  async getUserProjects(userId: string): Promise<ComicProject[]> {
    const { data, error } = await supabase
      .from('comic_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取项目列表失败: ${error.message}`);
    }

    return data.map(project => this.mapDatabaseProject(project));
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('comic_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`删除项目失败: ${error.message}`);
    }
  }

  // 私有辅助方法

  private async updateProjectStatus(projectId: string, status: ComicProject['status']): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('comic_projects')
      .update(updates)
      .eq('id', projectId);

    if (error) {
      throw new Error(`更新项目状态失败: ${error.message}`);
    }
  }

  private async updatePageStatus(pageId: string, status: ComicPage['generationStatus']): Promise<void> {
    const { error } = await supabase
      .from('comic_pages')
      .update({
        generation_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (error) {
      throw new Error(`更新页面状态失败: ${error.message}`);
    }
  }

  private async updatePageImage(pageId: string, imageUrl: string): Promise<void> {
    const { error } = await supabase
      .from('comic_pages')
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (error) {
      throw new Error(`更新页面图像失败: ${error.message}`);
    }
  }

  private async logProcessingStep(
    projectId: string,
    step: string,
    status: string,
    message?: string,
    processingTime?: number
  ): Promise<void> {
    await supabase
      .from('comic_processing_logs')
      .insert({
        project_id: projectId,
        step,
        status,
        message,
        processing_time_ms: processingTime
      });
  }

  private async logProcessingError(projectId: string, step: string, error: Error): Promise<void> {
    await supabase
      .from('comic_processing_logs')
      .insert({
        project_id: projectId,
        step,
        status: 'failed',
        message: error.message,
        error_details: {
          name: error.name,
          stack: error.stack
        }
      });
  }

  private mapDatabaseProject(data: any): ComicProject {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      originalText: data.original_text,
      extractedPlot: data.extracted_plot,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      settings: data.settings
    };
  }

  private mapDatabasePage(data: any): ComicPage {
    return {
      id: data.id,
      projectId: data.project_id,
      pageNumber: data.page_number,
      sceneDescription: data.scene_description,
      dialogue: data.dialogue,
      imageUrl: data.image_url,
      imagePrompt: data.image_prompt,
      generationStatus: data.generation_status,
      textBoxes: data.comic_text_boxes?.map((box: any) => ({
        id: box.id,
        pageId: box.page_id,
        textContent: box.text_content,
        positionX: box.position_x,
        positionY: box.position_y,
        width: box.width,
        height: box.height,
        fontFamily: box.font_family,
        fontSize: box.font_size,
        textColor: box.text_color,
        backgroundColor: box.background_color,
        boxType: box.box_type
      })) || []
    };
  }
}

// 导出服务实例创建函数
export const createTextToComicService = (
  deepSeekApiKey: string,
  googleConfig: { apiKey: string; projectId: string }
): TextToComicService => {
  return new TextToComicService(deepSeekApiKey, googleConfig);
};

export default TextToComicService;