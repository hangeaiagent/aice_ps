/**
 * 文字转漫画服务
 * 集成 Deepseek LLM 和 Google Nanobanana
 */

interface KeyScene {
  text: string;        // 原始文本
  description: string; // 场景描述（用于生成图片）
  emotion?: string;    // 主要情感
  visualElements?: {
    characters: string;
    environment: string;
    lighting: string;
    composition: string;
  };
  colorTone?: string;  // 色彩倾向
}

interface MainCharacter {
  name: string;
  appearance: string;
  personality: string;
}

interface ExtractedScenes {
  title: string;
  scenes: KeyScene[];
  style?: string;
  mainCharacter?: MainCharacter;
  colorScheme?: string;
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // 调用后端 OCR 服务
      const response = await fetch(`${apiBaseUrl}/api/text-to-comic/ocr/extract-text`, {
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
      // 直接抛出异常，不使用模拟数据
      throw new Error(`OCR文字提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用 Deepseek LLM 提取关键情节
   */
  async extractKeyScenes(text: string): Promise<ExtractedScenes> {
    try {
      // 优先使用后端代理API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false';
      
      if (useBackendProxy) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/text-to-comic/deepseek/extract-scenes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
          });
          
          if (response.ok) {
            const scenes = await response.json();
            return scenes;
          } else {
            throw new Error(`场景提取失败: ${response.status} ${response.statusText}`);
          }
        } catch (proxyError) {
          console.error('后端代理失败:', proxyError);
          throw new Error(`场景提取API调用失败: ${proxyError instanceof Error ? proxyError.message : '未知错误'}`);
        }
      }
      
      // 如果没有使用后端代理且没有配置 API Key，抛出错误
      if (!this.deepseekApiKey) {
        throw new Error('Deepseek API未配置，无法提取场景');
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
        // 直接抛出解析错误
        throw new Error(`解析场景数据失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }
    } catch (error) {
      console.error('Deepseek API 调用失败:', error);
      // 直接抛出异常
      throw new Error(`场景提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用 Google Nanobanana 生成漫画面板
   */
  async generateComicPanel(description: string, style: string = 'cartoon', scene?: KeyScene): Promise<string> {
    try {
      // 优先使用后端代理API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false';
      
      if (useBackendProxy) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/text-to-comic/nanobanana/generate-comic`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              description, 
              style,
              scene: scene ? {
                emotion: scene.emotion,
                colorTone: scene.colorTone,
                visualElements: scene.visualElements
              } : undefined
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.imageUrl || '';
          } else {
            throw new Error(`图片生成失败: ${response.status} ${response.statusText}`);
          }
        } catch (proxyError) {
          console.error('后端代理失败:', proxyError);
          throw new Error(`图片生成API调用失败: ${proxyError instanceof Error ? proxyError.message : '未知错误'}`);
        }
      }
      
      // 如果没有使用后端代理且没有配置 API Key，抛出错误
      if (!this.nanobananaApiKey) {
        throw new Error('Nanobanana API未配置，无法生成图片');
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
      // 直接抛出异常
      throw new Error(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

export const textToComicService = new TextToComicService();