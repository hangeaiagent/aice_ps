/**
 * 文字转漫画服务
 * 集成 Deepseek LLM 和 Google Nanobanana
 */

interface KeyScene {
  text: string;        // 原始文本
  description: string; // 场景描述（用于生成图片）
}

interface ExtractedScenes {
  title: string;
  scenes: KeyScene[];
  style?: string;
}

class TextToComicService {
  private deepseekApiKey: string;
  private nanobananaApiKey: string;
  private deepseekApiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
  private nanobananaApiUrl: string = 'https://api.nanobanana.google.com/v1/generate'; // 示例URL，需要替换为实际的

  constructor() {
    this.deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    this.nanobananaApiKey = import.meta.env.VITE_NANOBANANA_API_KEY || '';
  }

  /**
   * 从图片中提取文字 (OCR)
   */
  async extractTextFromImage(imageFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // 获取API基础URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      
      // 调用后端 OCR 服务
      const response = await fetch(`${apiBaseUrl}/api/ocr/extract-text`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('文字提取失败');
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('OCR 错误:', error);
      // 如果 OCR 服务不可用，返回示例文本
      return this.getMockText();
    }
  }

  /**
   * 使用 Deepseek LLM 提取关键情节
   */
  async extractKeyScenes(text: string): Promise<ExtractedScenes> {
    try {
      // 优先使用后端代理API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false';
      
      if (useBackendProxy) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/deepseek/extract-scenes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
          });
          
          if (response.ok) {
            const scenes = await response.json();
            return scenes;
          }
        } catch (proxyError) {
          console.error('后端代理失败，尝试直接调用:', proxyError);
        }
      }
      
      // 如果没有配置 API Key，使用模拟数据
      if (!this.deepseekApiKey) {
        return this.getMockScenes(text);
      }

      const prompt = `
你是一个专业的故事分析师。请将以下文本分解为3-6个关键场景，用于制作漫画。

要求：
1. 提取最重要的情节点
2. 每个场景包含原文的关键句子
3. 为每个场景生成一个视觉化描述（用于AI绘图）
4. 保持故事的连贯性
5. 适合儿童阅读理解

文本内容：
${text}

请以JSON格式返回：
{
  "title": "故事标题",
  "style": "cartoon", 
  "scenes": [
    {
      "text": "场景的原文内容",
      "description": "场景的视觉描述，包括人物、动作、环境等细节"
    }
  ]
}`;

      const response = await fetch(this.deepseekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的故事分析师，擅长将文本转换为视觉场景。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`Deepseek API 错误: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // 解析 JSON 响应
      try {
        const scenes = JSON.parse(content);
        return scenes;
      } catch (parseError) {
        console.error('解析 Deepseek 响应失败:', parseError);
        // 如果解析失败，使用备用方案
        return this.getMockScenes(text);
      }
    } catch (error) {
      console.error('Deepseek API 调用失败:', error);
      // 使用模拟数据作为后备
      return this.getMockScenes(text);
    }
  }

  /**
   * 使用 Google Nanobanana 生成漫画面板
   */
  async generateComicPanel(description: string, style: string = 'cartoon'): Promise<string> {
    try {
      // 优先使用后端代理API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false';
      
      if (useBackendProxy) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/nanobanana/generate-comic`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description, style })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.imageUrl || '';
          }
        } catch (proxyError) {
          console.error('后端代理失败，尝试直接调用:', proxyError);
        }
      }
      
      // 如果没有配置 API Key，使用模拟图片
      if (!this.nanobananaApiKey) {
        return this.getMockComicImage(description);
      }

      // 构建生成漫画的提示词
      const comicPrompt = `
${style} style comic panel:
${description}
child-friendly, colorful, expressive characters, clear storytelling
`;

      const response = await fetch(this.nanobananaApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.nanobananaApiKey}`
        },
        body: JSON.stringify({
          prompt: comicPrompt,
          model: 'nanobanana-comic-v1', // 示例模型名
          parameters: {
            width: 512,
            height: 512,
            style: style,
            quality: 'high',
            format: 'comic_panel'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Nanobanana API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl || data.image_url || '';
    } catch (error) {
      console.error('Nanobanana API 调用失败:', error);
      // 使用占位图片
      return this.getMockComicImage(description);
    }
  }

  /**
   * 获取模拟文本（用于测试）
   */
  private getMockText(): string {
    return `小明是个勤奋的学生，每天早上六点就起床学习。有一天，他在去学校的路上捡到了一个神奇的笔记本。
    
这个笔记本能够实现他写下的任何愿望。小明开始用它来帮助需要帮助的人。他帮助老奶奶找回了丢失的猫，帮助同学解决了数学难题。

但是有一天，笔记本突然失去了魔力。小明意识到，真正的力量不是来自魔法，而是来自内心的善良和努力。

从那以后，小明继续用自己的方式帮助他人，虽然没有了魔法，但他发现自己变得更加强大了。`;
  }

  /**
   * 获取模拟场景（用于测试）
   */
  private getMockScenes(text: string): ExtractedScenes {
    // 简单的文本分割逻辑
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 0);
    const sceneCount = Math.min(4, Math.max(2, Math.floor(sentences.length / 3)));
    const scenesPerGroup = Math.ceil(sentences.length / sceneCount);
    
    const scenes: KeyScene[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const start = i * scenesPerGroup;
      const end = Math.min(start + scenesPerGroup, sentences.length);
      const sceneText = sentences.slice(start, end).join('。');
      
      scenes.push({
        text: sceneText,
        description: this.generateMockDescription(sceneText, i)
      });
    }

    return {
      title: '我的故事',
      style: 'cartoon',
      scenes
    };
  }

  /**
   * 生成模拟的场景描述
   */
  private generateMockDescription(text: string, index: number): string {
    const descriptions = [
      'A young student studying diligently at a desk with books and a lamp, early morning light coming through the window',
      'A magical notebook glowing with golden light, floating in the air with sparkles around it',
      'A child helping an elderly person, showing kindness and compassion, warm and friendly atmosphere',
      'A group of children working together to solve problems, teamwork and friendship theme'
    ];
    
    return descriptions[index % descriptions.length];
  }

  /**
   * 获取模拟的漫画图片（使用占位图服务）
   */
  private getMockComicImage(description: string): string {
    // 使用 placeholder 服务生成示例图片
    const seed = Math.random().toString(36).substring(7);
    return `https://picsum.photos/seed/${seed}/512/512`;
  }
}

export const textToComicService = new TextToComicService();