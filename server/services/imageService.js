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
    const apiCallId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      console.log(`🔄 [${apiCallId}] 调用Gemini API - ${action}`);
      console.log(`📊 [${apiCallId}] API请求详情:`, {
        model: 'gemini-2.5-flash-image-preview',
        partsCount: parts.length,
        partsTypes: parts.map(p => p.inlineData ? 'image' : 'text'),
        action: action
      });

      const ai = this.getGoogleAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: parts },
        config: {
          responseModalities: ['IMAGE'],  // 只要求图片输出
          temperature: 0.8,  // 增加创意性
          candidateCount: 1,
        },
      });

      console.log(`📥 [${apiCallId}] API响应接收完成`);
      
      const candidate = response.candidates?.[0];
      console.log(`🔍 [${apiCallId}] 响应分析:`, {
        candidatesCount: response.candidates?.length || 0,
        hasCandidate: !!candidate,
        finishReason: candidate?.finishReason,
        contentPartsCount: candidate?.content?.parts?.length || 0,
        safetyRatings: candidate?.safetyRatings?.map(r => ({ category: r.category, probability: r.probability, blocked: r.blocked }))
      });

      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        
        console.error(`❌ [${apiCallId}] API响应无效:`, {
          finishReason,
          safetyRatings,
          candidate: candidate ? 'exists but invalid' : 'missing'
        });
        
        let detailedError = `AI did not return a valid result.`;
        if (finishReason) {
          detailedError += ` Reason: ${finishReason}.`;
        }
        if (safetyRatings?.some(r => r.blocked)) {
          detailedError += ` The prompt may have been blocked by safety filters.`;
        }
        throw new Error(detailedError);
      }

      console.log(`🔍 [${apiCallId}] 解析响应内容...`);
      for (const [index, part] of candidate.content.parts.entries()) {
        console.log(`📝 [${apiCallId}] Part ${index + 1}:`, {
          hasInlineData: !!part.inlineData,
          hasText: !!part.text,
          inlineDataType: part.inlineData?.mimeType,
          textLength: part.text?.length
        });
        
        if (part.inlineData) {
          console.log(`✅ [${apiCallId}] 找到图片数据，保存中...`);
          const base64Data = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          const result = await this.saveBase64Image(base64Data);
          console.log(`🎉 [${apiCallId}] 图片保存成功:`, {
            imageUrl: result.imageUrl,
            filename: result.filename
          });
          return result;
        }
        
        // 记录文本响应用于调试
        if (part.text) {
          console.log(`⚠️ [${apiCallId}] 模型返回了文本而不是图片:`, {
            textPreview: part.text.substring(0, 200),
            fullTextLength: part.text.length,
            finishReason: candidate?.finishReason
          });
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
        
        console.error(`❌ [${apiCallId}] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.error(`❌ [${apiCallId}] AI未返回预期结果`);
      throw new Error('AI 未能返回预期的图片结果。');
    } catch (e) {
      console.error(`💥 [${apiCallId}] API调用异常:`, {
        error: e.message,
        stack: e.stack?.split('\n').slice(0, 5)
      });
      
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
    const fusionId = `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`\n========== 图片融合开始 [${fusionId}] ==========`);
      console.log('📥 输入参数:', {
        mainImageName: mainImage.originalname,
        mainImageSize: mainImage.size,
        mainImageType: mainImage.mimetype,
        sourceImagesCount: sourceImages.length,
        sourceImages: sourceImages.map(f => ({
          name: f.originalname,
          size: f.size,
          type: f.mimetype
        })),
        promptLength: prompt.length,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      });

      console.log('🔄 步骤1: 处理主图片...');
      const mainImagePart = await this.fileToGenerativePart(mainImage);
      console.log('✅ 主图片处理完成:', {
        mimeType: mainImagePart.inlineData.mimeType,
        dataLength: mainImagePart.inlineData.data.length
      });
      
      console.log('🔄 步骤2: 处理附件图片...');
      const sourceImageParts = await Promise.all(
        sourceImages.map(async (file, index) => {
          console.log(`  处理附件图片 ${index + 1}: ${file.originalname}`);
          const part = await this.fileToGenerativePart(file);
          console.log(`  ✅ 附件图片 ${index + 1} 处理完成:`, {
            mimeType: part.inlineData.mimeType,
            dataLength: part.inlineData.data.length
          });
          return { ...part, index: index + 1 };
        })
      );

      console.log('🔄 步骤3: 构建提示词...');
      
      // 分析用户提示词，提取关键操作
      const userPrompt = prompt.replace(/\[使用附件图片\d+\]/g, '').trim();
      console.log('📝 用户原始提示词:', userPrompt);
      
      // 构建更强化的融合提示词
      let fullPrompt = `You are a professional photo editor specializing in image fusion and composition. 

CRITICAL INSTRUCTIONS:
1. You MUST create a NEW, DIFFERENT image by combining elements from ALL provided images
2. DO NOT simply return the original main image unchanged
3. You MUST generate a visually modified result that shows clear fusion/blending

Images to work with:
- PRIMARY IMAGE (base): ${mainImage.originalname}`;

      if (sourceImages.length > 0) {
        sourceImageParts.forEach(part => {
          const sourceImg = sourceImages[part.index - 1];
          fullPrompt += `\n- REFERENCE IMAGE ${part.index}: ${sourceImg.originalname} - Extract elements from this image`;
        });
      }
      
      fullPrompt += `\n\nSPECIFIC TASK: ${userPrompt}

EXECUTION REQUIREMENTS:
- Take the PRIMARY IMAGE as your base composition
- Extract specific elements, styles, colors, or features from the REFERENCE IMAGE(s)
- Apply/blend/fuse these extracted elements onto the primary image
- Ensure the result is visually DIFFERENT from the original primary image
- The output must show clear evidence of fusion/combination

IMPORTANT: The result MUST be a modified version that combines elements from both images. Do not return the original primary image unchanged.`;
      
      console.log('🎯 强化后的提示词长度:', fullPrompt.length);
      
      console.log('✅ 提示词构建完成:', {
        totalLength: fullPrompt.length,
        fullPrompt: fullPrompt
      });
      
      const textPart = { text: fullPrompt };
      const allParts = [mainImagePart, ...sourceImageParts.map(p => ({ inlineData: p.inlineData })), textPart];
      
      console.log('🔄 步骤4: 准备API调用...');
      console.log('📦 API调用参数:', {
        totalParts: allParts.length,
        imagePartsCount: allParts.length - 1, // 减去文本部分
        textPartLength: textPart.text.length
      });
      
      console.log('🚀 步骤5: 调用Google Gemini API...');
      const result = await this.callImageEditingModel(allParts, '合成');
      
      console.log('✅ 融合完成!', {
        fusionId,
        resultImageUrl: result.imageUrl,
        resultFilename: result.filename
      });
      console.log(`========== 图片融合结束 [${fusionId}] ==========\n`);
      
      return result;

    } catch (e) {
      console.error(`❌ 融合失败 [${fusionId}]:`, {
        error: e.message,
        stack: e.stack
      });
      console.log(`========== 图片融合失败 [${fusionId}] ==========\n`);
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