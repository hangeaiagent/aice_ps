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
router.post('/ocr/extract-text', upload.single('image'), async (req, res) => {
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
router.post('/deepseek/extract-scenes', async (req, res) => {
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
            content: `将以下文本分解为3-6个关键场景，用于制作漫画。

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

// Google Nanobanana API 代理
router.post('/nanobanana/generate-comic', async (req, res) => {
  try {
    const { description, style = 'cartoon' } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: '请提供场景描述' });
    }

    const nanobananaApiKey = process.env.NANOBANANA_API_KEY;
    
    if (!nanobananaApiKey) {
      // 返回模拟图片
      const mockImageUrl = generateMockComicImage();
      return res.json({ imageUrl: mockImageUrl });
    }

    // 注意：这是示例代码，实际的 Nanobanana API 端点和参数可能不同
    const response = await fetch('https://api.nanobanana.google.com/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nanobananaApiKey}`
      },
      body: JSON.stringify({
        prompt: `${style} style comic panel: ${description}. Child-friendly, colorful, expressive characters, clear storytelling`,
        model: 'nanobanana-comic-v1',
        parameters: {
          width: 512,
          height: 512,
          style: style,
          quality: 'high',
          format: 'comic_panel'
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ imageUrl: data.imageUrl || data.image_url });
    } else {
      throw new Error(`Nanobanana API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Nanobanana API 错误:', error);
    // 返回模拟图片
    const mockImageUrl = generateMockComicImage();
    res.json({ imageUrl: mockImageUrl });
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

// 生成模拟漫画图片
function generateMockComicImage() {
  const seed = Math.random().toString(36).substring(7);
  return `https://picsum.photos/seed/${seed}/512/512`;
}

export default router;