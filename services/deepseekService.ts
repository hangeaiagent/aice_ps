/**
 * DeepSeek LLM 服务 - 用于提取文本关键情节
 * 支持文本分析、情节提取、对话识别等功能
 */

export interface PlotElement {
  scene: string;
  description: string;
  characters: string[];
  dialogue: string[];
  emotion: string;
  setting: string;
  action: string;
}

export interface ExtractedPlot {
  title: string;
  summary: string;
  totalScenes: number;
  scenes: PlotElement[];
  mainCharacters: string[];
  theme: string;
  targetAge: string;
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }

  /**
   * 提取文本的关键情节
   */
  async extractPlot(text: string, options?: {
    maxScenes?: number;
    targetAge?: string;
    style?: string;
  }): Promise<ExtractedPlot> {
    const maxScenes = options?.maxScenes || 6;
    const targetAge = options?.targetAge || '6-12岁';
    const style = options?.style || '儿童友好';

    const prompt = this.buildPlotExtractionPrompt(text, maxScenes, targetAge, style);
    
    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parsePlotResponse(response);
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      throw new Error(`情节提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 为单个场景生成详细的图像描述
   */
  async generateImageDescription(scene: PlotElement, style: string = '卡通漫画风格'): Promise<string> {
    const prompt = `
请为以下漫画场景生成详细的图像描述，用于AI图像生成：

场景: ${scene.scene}
描述: ${scene.description}
角色: ${scene.characters.join(', ')}
情感: ${scene.emotion}
设定: ${scene.setting}
动作: ${scene.action}

要求：
1. 生成适合${style}的图像描述
2. 描述要具体、生动，包含视觉细节
3. 适合儿童观看，内容健康正面
4. 包含构图建议（如远景、中景、特写等）
5. 描述长度控制在150字以内

请直接返回图像描述，不要包含其他内容：
`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('图像描述生成失败:', error);
      // 返回基础描述作为fallback
      return `${scene.setting}中，${scene.characters.join('和')}${scene.action}，${scene.emotion}的氛围，${style}`;
    }
  }

  /**
   * 优化对话文本，使其更适合漫画展示
   */
  async optimizeDialogue(dialogue: string[], context: string): Promise<string[]> {
    if (!dialogue || dialogue.length === 0) return [];

    const prompt = `
请优化以下对话，使其更适合在漫画中展示：

上下文: ${context}
原始对话: ${dialogue.join('\n')}

优化要求：
1. 保持原意不变
2. 语言简洁明了，适合儿童理解
3. 每句话不超过20个字
4. 情感表达更加生动
5. 适合放在漫画对话框中

请返回优化后的对话，每行一句，格式如下：
对话1
对话2
...
`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return response.trim().split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('对话优化失败:', error);
      return dialogue; // 返回原始对话
    }
  }

  /**
   * 构建情节提取提示词
   */
  private buildPlotExtractionPrompt(text: string, maxScenes: number, targetAge: string, style: string): string {
    return `
你是一个专业的儿童绘本编辑，请分析以下文本并提取关键情节，用于制作漫画绘本：

原文：
${text}

请按以下JSON格式返回提取结果：

{
  "title": "为这个故事起一个吸引人的标题",
  "summary": "用1-2句话概括故事主要内容",
  "totalScenes": ${maxScenes},
  "scenes": [
    {
      "scene": "场景标题",
      "description": "场景的详细描述",
      "characters": ["角色1", "角色2"],
      "dialogue": ["对话1", "对话2"],
      "emotion": "情感氛围（如：开心、紧张、温馨等）",
      "setting": "场景设定（如：教室、公园、家里等）",
      "action": "主要动作或事件"
    }
  ],
  "mainCharacters": ["主要角色列表"],
  "theme": "故事主题",
  "targetAge": "${targetAge}"
}

要求：
1. 将原文分解为${maxScenes}个主要场景
2. 每个场景要有明确的视觉元素
3. 对话要简洁易懂，适合${targetAge}儿童
4. 场景描述要生动具体，便于绘制
5. 保持故事的完整性和连贯性
6. 内容健康正面，符合儿童价值观
7. 必须严格按照JSON格式返回，不要包含其他内容

请直接返回JSON，不要有任何前缀或后缀说明：
`;
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('DeepSeek API返回格式错误');
    }

    return data.choices[0].message.content;
  }

  /**
   * 解析情节提取响应
   */
  private parsePlotResponse(response: string): ExtractedPlot {
    try {
      // 清理响应文本，移除可能的markdown格式
      const cleanResponse = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleanResponse);

      // 验证必要字段
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('缺少场景数据');
      }

      return {
        title: parsed.title || '未命名故事',
        summary: parsed.summary || '',
        totalScenes: parsed.totalScenes || parsed.scenes.length,
        scenes: parsed.scenes.map((scene: any, index: number) => ({
          scene: scene.scene || `场景${index + 1}`,
          description: scene.description || '',
          characters: Array.isArray(scene.characters) ? scene.characters : [],
          dialogue: Array.isArray(scene.dialogue) ? scene.dialogue : [],
          emotion: scene.emotion || '中性',
          setting: scene.setting || '未指定',
          action: scene.action || ''
        })),
        mainCharacters: Array.isArray(parsed.mainCharacters) ? parsed.mainCharacters : [],
        theme: parsed.theme || '',
        targetAge: parsed.targetAge || '6-12岁'
      };
    } catch (error) {
      console.error('解析DeepSeek响应失败:', error);
      console.error('原始响应:', response);
      
      // 创建fallback结果
      return this.createFallbackPlot(response);
    }
  }

  /**
   * 创建fallback情节结果
   */
  private createFallbackPlot(originalText: string): ExtractedPlot {
    // 简单的文本分割逻辑作为fallback
    const sentences = originalText.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const scenesPerGroup = Math.max(1, Math.floor(sentences.length / 4));
    
    const scenes: PlotElement[] = [];
    for (let i = 0; i < Math.min(4, sentences.length); i++) {
      const startIdx = i * scenesPerGroup;
      const endIdx = Math.min((i + 1) * scenesPerGroup, sentences.length);
      const sceneText = sentences.slice(startIdx, endIdx).join('。');
      
      scenes.push({
        scene: `场景${i + 1}`,
        description: sceneText,
        characters: ['角色'],
        dialogue: [sceneText.length > 30 ? sceneText.substring(0, 30) + '...' : sceneText],
        emotion: '中性',
        setting: '室内',
        action: '对话'
      });
    }

    return {
      title: '故事',
      summary: originalText.substring(0, 100) + (originalText.length > 100 ? '...' : ''),
      totalScenes: scenes.length,
      scenes,
      mainCharacters: ['主角'],
      theme: '成长',
      targetAge: '6-12岁'
    };
  }
}

// 导出服务实例创建函数
export const createDeepSeekService = (config: DeepSeekConfig): DeepSeekService => {
  return new DeepSeekService(config);
};

// 导出默认配置
export const getDefaultDeepSeekConfig = (): Partial<DeepSeekConfig> => ({
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat'
});

export default DeepSeekService;