import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// OCR 文字提取
router.post('/text-to-comic/ocr/extract-text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    // 这里可以集成实际的 OCR 服务
    // 例如：Google Vision API, AWS Textract, Azure Computer Vision, 或开源的 Tesseract.js
    
    // 示例：使用 Google Vision API
    const googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
    
    if (googleVisionApiKey) {
      const base64Image = req.file.buffer.toString('base64');
      
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              image: {
                content: base64Image
              },
              features: [{
                type: 'TEXT_DETECTION',
                maxResults: 1
              }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.responses[0]?.fullTextAnnotation?.text || '';
        return res.json({ text });
      }
    }

    // 如果没有配置 OCR 服务，返回示例文本
    const sampleText = `小明是一个勤奋的学生。每天早上，他都会早早起床，认真完成作业。

有一天，老师布置了一篇关于"我的梦想"的作文。小明想了很久，决定写自己想成为科学家的梦想。

他写道："我想发明能够帮助人类的机器人，让生活变得更美好。"

老师看了他的作文，给了他一个大大的赞，并鼓励他要坚持梦想，努力学习。`;

    res.json({ text: sampleText });
  } catch (error) {
    console.error('OCR 错误:', error);
    res.status(500).json({ error: '文字提取失败' });
  }
});

// Deepseek API 代理
router.post('/text-to-comic/deepseek/extract-scenes', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '请提供文本内容' });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!deepseekApiKey) {
      // 返回模拟数据
      const mockScenes = generateMockScenes(text);
      return res.json(mockScenes);
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
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
content: `作为专业的儿童读物插画师和故事分析专家，请将以下文本转换为漫画场景。

## 分析要求：
1. **情节提取**：识别3-6个关键转折点和情感高潮
2. **角色一致性**：确保主角在各场景中外观统一
3. **情感映射**：为每个场景标识主要情感并匹配视觉元素
4. **儿童友好**：适合6-12岁儿童理解和欣赏

## 视觉化标准：
- **人物表情**：具体描述面部表情和情感状态
- **环境设定**：明确时间、地点、天气、氛围
- **动作描述**：详细的肢体语言和互动
- **色彩建议**：符合情节情感的色调方案
- **构图要求**：突出重点的视角和布局

## 文本内容：
${text}

## 输出格式：
{
  "title": "故事标题",
  "style": "cartoon",
  "mainCharacter": {
    "name": "主角名字",
    "appearance": "主角外观描述（年龄、性别、服装、特征）",
    "personality": "性格特点"
  },
  "colorScheme": "整体色彩方案（温暖/冷色调/明亮/柔和等）",
  "scenes": [
    {
      "text": "场景原文内容",
      "emotion": "主要情感（开心/紧张/好奇/感动等）",
      "description": "专业插画描述",
      "visualElements": {
        "characters": "人物状态和表情",
        "environment": "环境和背景",
        "lighting": "光线和氛围",
        "composition": "构图和视角"
      },
      "colorTone": "该场景的色彩倾向"
    }
  ]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const scenes = JSON.parse(content);
        res.json(scenes);
      } catch (parseError) {
        // 如果解析失败，返回模拟数据
        const mockScenes = generateMockScenes(text);
        res.json(mockScenes);
      }
    } else {
      throw new Error(`Deepseek API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Deepseek API 错误:', error);
    // 返回模拟数据
    const mockScenes = generateMockScenes(req.body.text || '');
    res.json(mockScenes);
  }
});

// 漫画图片生成API - 使用真实的AI图片生成
router.post('/text-to-comic/nanobanana/generate-comic', async (req, res) => {
  const requestId = `comic_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    const { description, style = 'cartoon', scene } = req.body;
    
    console.log(`[${requestId}] 🎨 漫画生成请求开始`, {
      API接口: '/api/text-to-comic/nanobanana/generate-comic',
      描述: description?.substring(0, 100) + (description?.length > 100 ? '...' : ''),
      风格: style,
      场景信息: scene ? '有' : '无',
      时间戳: new Date().toISOString()
    });
    
    if (!description) {
      console.error(`[${requestId}] ❌ 请求参数错误: 缺少场景描述`);
      return res.status(400).json({ 
        error: '请提供场景描述',
        requestId 
      });
    }

    // 构建增强的提示词
    const promptData = buildEnhancedComicPrompt(description, style, scene);
    const enhancedPrompt = promptData.positive;
    
    console.log(`[${requestId}] 📝 提示词构建完成`, {
      原始描述: description,
      增强提示词长度: enhancedPrompt.length,
      负面提示词长度: promptData.negative.length,
      增强提示词预览: enhancedPrompt.substring(0, 200) + '...'
    });

    // 检查图片生成服务健康状态
    console.log(`[${requestId}] 🔍 检查图片生成服务状态...`);
    const healthCheckUrl = 'http://localhost:3002/api/custom-image-generation/health';
    
    let healthResponse;
    try {
      healthResponse = await fetch(healthCheckUrl);
      console.log(`[${requestId}] 📡 健康检查响应`, {
        API接口: healthCheckUrl,
        状态码: healthResponse.status,
        状态文本: healthResponse.statusText,
        响应头: Object.fromEntries(healthResponse.headers.entries())
      });
    } catch (healthError) {
      console.error(`[${requestId}] ❌ 健康检查请求失败`, {
        API接口: healthCheckUrl,
        错误信息: healthError.message,
        错误类型: healthError.name
      });
      throw new Error(`图片生成服务不可用: ${healthError.message}`);
    }
    
    if (!healthResponse.ok) {
      console.error(`[${requestId}] ❌ 健康检查失败`, {
        状态码: healthResponse.status,
        状态文本: healthResponse.statusText
      });
      throw new Error(`图片生成服务健康检查失败: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log(`[${requestId}] ✅ 健康检查成功`, {
      返回内容: healthData,
      Python脚本存在: healthData.pythonScript?.exists,
      脚本路径: healthData.pythonScript?.path
    });
    
    // 检查Python脚本是否可用
    if (!healthData.pythonScript || !healthData.pythonScript.exists) {
      console.error(`[${requestId}] ❌ Python脚本不存在`, {
        脚本信息: healthData.pythonScript
      });
      throw new Error('AI图片生成脚本不存在，请检查backend/enhanced_image_generator.py文件');
    }

    // 调用真实的图片生成API
    console.log(`[${requestId}] 🚀 开始调用图片生成API...`);
    const imageGenUrl = 'http://localhost:3002/api/custom-image-generation/generate';
    const imageGenPayload = {
      prompt: enhancedPrompt,
      negative_prompt: promptData.negative,
      width: 512,
      height: 512,
      num_inference_steps: 20,
      guidance_scale: 7.5,
      seed: Math.floor(Math.random() * 1000000)
    };
    
    console.log(`[${requestId}] 📤 图片生成请求参数`, {
      API接口: imageGenUrl,
      请求载荷: {
        ...imageGenPayload,
        prompt: imageGenPayload.prompt.substring(0, 100) + '...',
        negative_prompt: imageGenPayload.negative_prompt.substring(0, 50) + '...'
      }
    });

    let imageGenResponse;
    try {
      imageGenResponse = await fetch(imageGenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageGenPayload)
      });
      
      console.log(`[${requestId}] 📡 图片生成API响应`, {
        API接口: imageGenUrl,
        状态码: imageGenResponse.status,
        状态文本: imageGenResponse.statusText,
        响应头: Object.fromEntries(imageGenResponse.headers.entries())
      });
    } catch (apiError) {
      console.error(`[${requestId}] ❌ 图片生成API请求失败`, {
        API接口: imageGenUrl,
        错误信息: apiError.message,
        错误类型: apiError.name,
        错误堆栈: apiError.stack
      });
      throw new Error(`图片生成API请求失败: ${apiError.message}`);
    }

    if (!imageGenResponse.ok) {
      let errorText = '';
      try {
        errorText = await imageGenResponse.text();
      } catch (e) {
        errorText = '无法读取错误响应';
      }
      
      console.error(`[${requestId}] ❌ 图片生成API返回错误`, {
        状态码: imageGenResponse.status,
        状态文本: imageGenResponse.statusText,
        错误响应: errorText
      });
      throw new Error(`图片生成失败: ${imageGenResponse.status} ${imageGenResponse.statusText} - ${errorText}`);
    }

    const imageData = await imageGenResponse.json();
    console.log(`[${requestId}] 📥 图片生成API返回内容`, {
      返回数据: imageData,
      成功状态: imageData.success,
      图片URL: imageData.imageUrl,
      文件名: imageData.filename,
      请求ID: imageData.requestId
    });

    if (!imageData.success) {
      console.error(`[${requestId}] ❌ 图片生成失败`, {
        错误信息: imageData.message || imageData.error,
        完整响应: imageData
      });
      throw new Error(`图片生成失败: ${imageData.message || imageData.error || '未知错误'}`);
    }

    if (!imageData.imageUrl) {
      console.error(`[${requestId}] ❌ 图片生成成功但未返回图片URL`, {
        完整响应: imageData
      });
      throw new Error('图片生成成功但未返回图片URL');
    }

    console.log(`[${requestId}] ✅ 漫画图片生成成功`, {
      图片URL: imageData.imageUrl,
      处理时长: `${Date.now() - parseInt(requestId.split('_')[1])}ms`
    });

    return res.json({ 
      imageUrl: imageData.imageUrl,
      requestId: requestId,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ 漫画生成过程发生异常`, {
      错误信息: error.message,
      错误类型: error.name,
      错误堆栈: error.stack,
      处理时长: `${Date.now() - parseInt(requestId.split('_')[1])}ms`
    });
    
    // 直接返回错误，不使用模拟图片
    return res.status(500).json({
      error: `图片生成失败: ${error.message}`,
      requestId: requestId,
      timestamp: new Date().toISOString(),
      details: '请检查AI图片生成服务是否正常运行'
    });
  }
});

// 生成模拟场景数据
function generateMockScenes(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 0);
  const sceneCount = Math.min(4, Math.max(2, Math.floor(sentences.length / 3)));
  const scenesPerGroup = Math.ceil(sentences.length / sceneCount);
  
  const scenes = [];
  for (let i = 0; i < sceneCount; i++) {
    const start = i * scenesPerGroup;
    const end = Math.min(start + scenesPerGroup, sentences.length);
    const sceneText = sentences.slice(start, end).join('。');
    
    scenes.push({
      text: sceneText || `场景 ${i + 1}`,
      description: generateMockDescription(i)
    });
  }

  return {
    title: '我的故事',
    style: 'cartoon',
    scenes
  };
}

// 生成模拟场景描述
function generateMockDescription(index) {
  const descriptions = [
    'A young student sitting at a desk, studying with books and notebooks, warm morning light',
    'Children playing together in a colorful playground, happy expressions',
    'A teacher standing in front of a classroom, explaining something with enthusiasm',
    'A child helping another child, showing kindness and friendship'
  ];
  
  return descriptions[index % descriptions.length];
}

// 构建增强的漫画生成提示词
function buildEnhancedComicPrompt(description, style = 'cartoon', scene = null) {
  // 解析场景描述，提取关键元素
  let enhancedPrompt = '';
  
  // 基础风格设定
  const stylePrompts = {
    cartoon: 'vibrant cartoon style, Disney-Pixar inspired, children\'s book illustration',
    anime: 'anime manga style, Studio Ghibli inspired, soft colors',
    realistic: 'semi-realistic illustration style, detailed artwork',
    watercolor: 'soft watercolor painting style, gentle brushstrokes',
    sketch: 'detailed pencil sketch style, expressive linework'
  };
  
  enhancedPrompt += stylePrompts[style] || stylePrompts.cartoon;
  
  // 如果有场景信息，添加情感和色彩指导
  if (scene) {
    if (scene.emotion) {
      const emotionPrompts = {
        '开心': 'joyful, bright, cheerful atmosphere',
        '紧张': 'tense, dramatic lighting, focused composition',
        '好奇': 'curious, wonder-filled, exploratory mood',
        '感动': 'touching, warm, emotional connection',
        '兴奋': 'excited, energetic, dynamic composition',
        '平静': 'peaceful, serene, calm atmosphere'
      };
      const emotionPrompt = emotionPrompts[scene.emotion] || 'positive emotional tone';
      enhancedPrompt += `, ${emotionPrompt}`;
    }
    
    if (scene.colorTone) {
      enhancedPrompt += `, ${scene.colorTone} color palette`;
    }
    
    if (scene.visualElements) {
      if (scene.visualElements.lighting) {
        enhancedPrompt += `, ${scene.visualElements.lighting}`;
      }
      if (scene.visualElements.composition) {
        enhancedPrompt += `, ${scene.visualElements.composition}`;
      }
    }
  }
  
  // 核心场景描述
  enhancedPrompt += `, ${description}`;
  
  // 质量和风格增强词
  const qualityEnhancers = [
    'professional children\'s book illustration',
    'highly detailed',
    'expressive characters',
    'clear storytelling composition',
    'bright and cheerful colors',
    'child-friendly atmosphere',
    'masterpiece quality',
    'beautiful artwork',
    '4K resolution'
  ];
  
  enhancedPrompt += ', ' + qualityEnhancers.join(', ');
  
  // 负面提示词（避免不适合儿童的内容）
  const negativePrompts = [
    'dark themes',
    'scary elements',
    'violence',
    'inappropriate content',
    'blurry',
    'low quality',
    'distorted faces',
    'ugly',
    'deformed',
    'bad anatomy',
    'text',
    'watermark'
  ];
  
  return {
    positive: enhancedPrompt,
    negative: negativePrompts.join(', ')
  };
}


export default router;