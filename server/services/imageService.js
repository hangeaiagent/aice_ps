import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageGenerationService {
  constructor() {
    this.aiInstance = null;
    this.lastUsedApiKey = null;
  }

  // 获取 Google AI 实例
  getGoogleAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("未找到 GEMINI_API_KEY 环境变量");
    }

    // 如果 API key 改变了，重新初始化实例
    if (!this.aiInstance || apiKey !== this.lastUsedApiKey) {
      try {
        this.aiInstance = new GoogleGenAI({ apiKey });
        this.lastUsedApiKey = apiKey;
      } catch (e) {
        console.error("初始化 GoogleGenAI 失败", e);
        throw new Error(`初始化 AI 服务失败: ${e.message}`);
      }
    }

    return this.aiInstance;
  }

  // 处理 API 错误
  handleApiError(error, action) {
    console.error(`API call for "${action}" failed:`, error);
    let message = `在"${action}"期间发生错误: ${error.message || '未知通信错误'}`;
    
    try {
      const errorObj = JSON.parse(error.message);
      if (errorObj?.error?.message) {
        message = `在"${action}"期间发生错误: ${errorObj.error.message}`;
      }
    } catch(e) {
      if (String(error.message).includes('API key not valid')) {
        message = 'API 密钥无效。请检查 GEMINI_API_KEY 环境变量。';
      } else if (String(error.message).includes('xhr error')) {
        message = `与 AI 服务的通信失败。这可能是由网络问题或无效的 API 密钥引起的。`;
      }
    }

    return new Error(message);
  }

  // 将文件转换为 base64
  async fileToBase64(buffer, mimeType) {
    return buffer.toString('base64');
  }

  // 将 Buffer 转换为 GenerativePart
  async bufferToGenerativePart(buffer, mimeType) {
    const base64data = await this.fileToBase64(buffer, mimeType);
    return {
      inlineData: {
        mimeType: mimeType,
        data: base64data,
      },
    };
  }

  // 将 multer 文件转换为 GenerativePart
  async fileToGenerativePart(file) {
    return this.bufferToGenerativePart(file.buffer, file.mimetype);
  }

  // 保存 base64 图片到本地或云存储
  async saveBase64Image(base64Data, originalFilename = null) {
    try {
      // 提取 base64 数据（去掉 data:image/xxx;base64, 前缀）
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('无效的 base64 图片数据');
      }
      
      const mimeType = matches[1];
      const imageBuffer = Buffer.from(matches[2], 'base64');
      
      // 生成文件名
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const filename = `${uuidv4()}.${ext}`;
      
      // 根据配置选择存储方式
      const result = await storageService.saveImage(imageBuffer, filename, mimeType);
      
      return result;
    } catch (error) {
      console.error('保存图片失败:', error);
      throw new Error(`保存图片失败: ${error.message}`);
    }
  }

  // 调用图片编辑模型
  async callImageEditingModel(parts, action) {
    try {
      const ai = this.getGoogleAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: parts },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      const candidate = response.candidates?.[0];

      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        
        let detailedError = `AI did not return a valid result.`;
        if (finishReason) {
          detailedError += ` Reason: ${finishReason}.`;
        }
        if (safetyRatings?.some(r => r.blocked)) {
          detailedError += ` The prompt may have been blocked by safety filters.`;
        }
        throw new Error(detailedError);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const base64Data = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          const result = await this.saveBase64Image(base64Data);
          return result;
        }
        
        // 记录文本响应用于调试
        if (part.text) {
          console.log(`[${action}] 模型返回了文本:`, part.text.substring(0, 200));
        }
      }
      
      if (candidate.content.parts[0]?.text) {
        const finishReason = candidate?.finishReason;
        let errorMsg = "模型返回了文本而不是图片。";
        
        if (finishReason === 'SAFETY') {
          errorMsg += " 提示词可能被安全过滤器拦截，请尝试使用更简单的描述。";
        } else {
          errorMsg += " 请尝试简化提示词或使用不同的描述方式。";
        }
        
        throw new Error(errorMsg);
      }

      throw new Error('AI 未能返回预期的图片结果。');
    } catch (e) {
      if (e instanceof Error && (e.message.includes("Model responded with text") || e.message.includes("AI did not return a valid result"))) {
        throw e;
      }
      throw this.handleApiError(e, action);
    }
  }

  // 从文本生成图片
  async generateImageFromText(prompt, aspectRatio) {
    try {
      const ai = this.getGoogleAI();
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const base64Data = `data:image/png;base64,${base64ImageBytes}`;
        const result = await this.saveBase64Image(base64Data);
        return result;
      }
      throw new Error('AI 未能生成图片。');
    } catch (e) {
      throw this.handleApiError(e, '生成图片');
    }
  }

  // 生成编辑后的图片
  async generateEditedImage(imageFile, prompt, hotspot) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    let textPart;
    if (hotspot && hotspot.x !== undefined && hotspot.y !== undefined) {
      textPart = { text: `Apply this edit at hotspot (${hotspot.x}, ${hotspot.y}): ${prompt}` };
    } else {
      textPart = { text: `Apply this edit to the image: ${prompt}` };
    }
    return this.callImageEditingModel([imagePart, textPart], '修饰');
  }

  // 生成滤镜效果图片
  async generateFilteredImage(imageFile, prompt) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    const primaryTextPart = { text: `Apply this filter: ${prompt}` };
    try {
      return await this.callImageEditingModel([imagePart, primaryTextPart], '滤镜');
    } catch (error) {
      if (error instanceof Error && error.message.includes("Model responded with text instead of an image")) {
        console.warn("Original filter prompt failed. Trying a fallback without the English prefix.");
        const fallbackTextPart = { text: prompt };
        return await this.callImageEditingModel([imagePart, fallbackTextPart], '滤镜 (fallback)');
      }
      throw error;
    }
  }

  // 生成风格化图片
  async generateStyledImage(imageFile, prompt) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    const primaryTextPart = { text: `Apply this artistic style: ${prompt}` };
    try {
      return await this.callImageEditingModel([imagePart, primaryTextPart], '应用风格');
    } catch (error) {
      if (error instanceof Error && error.message.includes("Model responded with text instead of an image")) {
        console.warn("Original styled image prompt failed. Trying a fallback without the English prefix.");
        const fallbackTextPart = { text: prompt };
        return await this.callImageEditingModel([imagePart, fallbackTextPart], '应用风格 (fallback)');
      }
      throw error;
    }
  }

  // 生成调整后的图片
  async generateAdjustedImage(imageFile, prompt) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    const primaryTextPart = { text: `Apply this adjustment: ${prompt}` };
    try {
      return await this.callImageEditingModel([imagePart, primaryTextPart], '调整');
    } catch (error) {
      if (error instanceof Error && error.message.includes("Model responded with text instead of an image")) {
        console.warn("Original adjustment prompt failed. Trying a fallback without the English prefix.");
        const fallbackTextPart = { text: prompt };
        return await this.callImageEditingModel([imagePart, fallbackTextPart], '调整 (fallback)');
      }
      throw error;
    }
  }

  // 生成纹理效果图片
  async generateTexturedImage(imageFile, prompt) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    const primaryTextPart = { text: `Apply this texture: ${prompt}` };
    try {
      return await this.callImageEditingModel([imagePart, primaryTextPart], '纹理');
    } catch (error) {
      if (error instanceof Error && error.message.includes("Model responded with text instead of an image")) {
        console.warn("Original texture prompt failed. Trying a fallback without the English prefix.");
        const fallbackTextPart = { text: prompt };
        return await this.callImageEditingModel([imagePart, fallbackTextPart], '纹理 (fallback)');
      }
      throw error;
    }
  }

  // 移除背景
  async removeBackgroundImage(imageFile) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    const textPart = { text: 'Remove the background of this image, leaving only the main subject with a transparent background.' };
    return this.callImageEditingModel([imagePart, textPart], '抠图');
  }

  // 生成融合图片
  async generateFusedImage(mainImage, sourceImages, prompt) {
    try {
      const mainImagePart = await this.fileToGenerativePart(mainImage);
      
      const sourceImageParts = await Promise.all(
        sourceImages.map((file, index) => 
          this.fileToGenerativePart(file).then(part => ({ ...part, index: index + 1 }))
        )
      );

      // 构建更明确的图片融合提示词
      let fullPrompt = `You are an expert image editor. Your task is to generate a NEW image by fusing/blending the provided images.

IMPORTANT: You MUST generate an image, not text.

Images provided:
- Main image (first image)`;

      if (sourceImages.length > 0) {
        sourceImageParts.forEach(part => {
          fullPrompt += `\n- Source image ${part.index}`;
        });
      }
      
      fullPrompt += `\n\nUser instructions: ${prompt}\n\n`;
      fullPrompt += `Generate a creative fusion of these images following the user's instructions. `;
      fullPrompt += `Output: A single fused/blended image combining elements from all provided images.`;
      
      const textPart = { text: fullPrompt };
      const allParts = [mainImagePart, ...sourceImageParts.map(p => ({ inlineData: p.inlineData })), textPart];
      
      console.log('融合图片请求:', {
        mainImageSize: mainImage.size,
        sourceImagesCount: sourceImages.length,
        promptLength: fullPrompt.length
      });
      
      return await this.callImageEditingModel(allParts, '合成');

    } catch (e) {
      console.error('融合图片失败:', e);
      throw this.handleApiError(e, '合成');
    }
  }

  // 生成年代风格图片
  async generateDecadeImage(imageFile, prompt) {
    const imagePart = await this.fileToGenerativePart(imageFile);
    
    try {
      const textPart = { text: prompt };
      const decade = this.extractDecade(prompt);
      return await this.callImageEditingModel([imagePart, textPart], `生成 ${decade} 图像`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Model responded with text instead of an image")) {
        console.warn("Original prompt failed. Trying a fallback.");
        const decade = this.extractDecade(prompt);
        if (!decade) throw error; 
        
        const fallbackPrompt = this.getFallbackPrompt(decade);
        const fallbackTextPart = { text: fallbackPrompt };
        return await this.callImageEditingModel([imagePart, fallbackTextPart], `生成 ${decade} 图像 (fallback)`);
      }
      throw error;
    }
  }

  // 批量生成风格化图片
  async generateBatchStyledImages(imageFile, prompts) {
    const results = [];
    const concurrency = 3; // 并发限制
    
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchPromises = batch.map(async (prompt, index) => {
        try {
          const result = await this.generateStyledImage(imageFile, prompt);
          return { 
            index: i + index, 
            status: 'done', 
            url: result.imageUrl,
            filename: result.filename
          };
        } catch (error) {
          console.error(`生成第 ${i + index} 张图片失败:`, error);
          return { 
            index: i + index, 
            status: 'error', 
            error: error.message 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  // 获取创意建议
  async generateCreativeSuggestions(imageFile, type) {
    try {
      const ai = this.getGoogleAI();
      const imagePart = await this.fileToGenerativePart(imageFile);
      const textPrompt = `Analyze this image. Suggest 4 creative and interesting image ${type}s that would look good on it. Provide a very short, catchy name (2-4 words, in Chinese) and the corresponding detailed English prompt for each suggestion.`;
      const textPart = { text: textPrompt };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "A very short, catchy name for the effect in Chinese." },
                    prompt: { type: "string", description: "The detailed English prompt to achieve the effect." }
                  }
                }
              }
            }
          }
        }
      });

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString);
      return result.suggestions;
    } catch (e) {
      throw this.handleApiError(e, '获取灵感');
    }
  }

  // 辅助方法
  extractDecade(prompt) {
    const match = prompt.match(/(\d{4}s)/);
    return match ? match[1] : null;
  }

  getFallbackPrompt(decade) {
    return `Create a photograph of the person in this image as if they were living in the ${decade}. The photograph should capture the distinct fashion, hairstyles, and overall atmosphere of that time period. Ensure the final image is a clear photograph that looks authentic to the era.`;
  }
}

export const imageGenerationService = new ImageGenerationService();