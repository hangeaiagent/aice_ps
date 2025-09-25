import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { imageGenerationService } from './services/imageService.js';
import paymentsRouter from './routes/payments-simple.mjs';
import userPermissionsRouter from './routes/user-permissions.mjs';
import templatesRouter from './routes/templates.mjs';
import taskHistoryRouter from './routes/task-history.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志函数
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const stack = new Error().stack;
  const caller = stack.split('\n')[2]; // 获取调用者信息
  const lineMatch = caller.match(/server\.js:(\d+):\d+/);
  const lineNumber = lineMatch ? lineMatch[1] : 'unknown';
  
  const logMessage = `[${timestamp}] [SERVER] [${level.toUpperCase()}] [Line:${lineNumber}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(`[${timestamp}] [SERVER] [DATA] [Line:${lineNumber}]`, JSON.stringify(data, null, 2));
  }
}

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 提供生成的图片
app.use('/images', express.static(path.join(__dirname, 'uploads')));

// 配置 multer 用于文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 支付路由
app.use('/api/payments', paymentsRouter);

// 用户权限路由
app.use('/api/user-permissions', userPermissionsRouter);

// 模板路由
app.use('/api', templatesRouter);

// 任务记录路由
app.use('/api/task-history', taskHistoryRouter);

// 自定义图片生成路由
import customImageGenerationRouter from './routes/custom-image-generation.mjs';
app.use('/api', customImageGenerationRouter);

// 文字转漫画路由
import textToComicRouter from './routes/text-to-comic.mjs';
app.use('/api', textToComicRouter);

// 图片代理路由 - 解决CORS问题
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: '缺少 url 参数' });
    }
    
    // 验证URL是否来自允许的域名
    const allowedDomains = ['spotgitagent.s3.us-east-1.amazonaws.com', 'picsum.photos'];
    const urlObj = new URL(url);
    if (!allowedDomains.includes(urlObj.hostname)) {
      return res.status(403).json({ error: '不允许的图片域名' });
    }
    
    console.log('代理图片请求:', url);
    
    // 获取图片
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: '无法获取图片' });
    }
    
    // 设置响应头
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // 缓存1天
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });
    
    // 流式传输图片数据
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('图片代理失败:', error);
    res.status(500).json({ error: '图片代理失败', message: error.message });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AicePS Server is running' });
});

// 文本生成图片接口
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: '缺少 prompt 参数' });
    }

    console.log('生成图片请求:', { prompt, aspectRatio });
    
    const result = await imageGenerationService.generateImageFromText(prompt, aspectRatio);
    
    res.json({
      success: true,
      imageUrl: result.imageUrl,
      filename: result.filename
    });
    
  } catch (error) {
    console.error('图片生成失败:', error);
    res.status(500).json({ 
      error: '图片生成失败', 
      message: error.message 
    });
  }
});

// 图片编辑接口
app.post('/api/edit-image', upload.single('image'), async (req, res) => {
  try {
    const { prompt, hotspot, type = 'edit' } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: '缺少图片文件' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: '缺少 prompt 参数' });
    }

    console.log('图片编辑请求:', { prompt, hotspot, type, filename: imageFile.originalname });
    
    let result;
    const parsedHotspot = hotspot ? JSON.parse(hotspot) : null;
    
    switch (type) {
      case 'edit':
        result = await imageGenerationService.generateEditedImage(imageFile, prompt, parsedHotspot);
        break;
      case 'filter':
        result = await imageGenerationService.generateFilteredImage(imageFile, prompt);
        break;
      case 'style':
        result = await imageGenerationService.generateStyledImage(imageFile, prompt);
        break;
      case 'adjustment':
        result = await imageGenerationService.generateAdjustedImage(imageFile, prompt);
        break;
      case 'texture':
        result = await imageGenerationService.generateTexturedImage(imageFile, prompt);
        break;
      case 'remove-background':
        result = await imageGenerationService.removeBackgroundImage(imageFile);
        break;
      case 'fusion':
        // 处理多图片融合
        const sourceFiles = req.files ? req.files.slice(1) : [];
        result = await imageGenerationService.generateFusedImage(imageFile, sourceFiles, prompt);
        break;
      case 'decade':
        result = await imageGenerationService.generateDecadeImage(imageFile, prompt);
        break;
      default:
        return res.status(400).json({ error: '不支持的编辑类型' });
    }
    
    res.json({
      success: true,
      imageUrl: result.imageUrl,
      filename: result.filename
    });
    
  } catch (error) {
    console.error('图片编辑失败:', error);
    res.status(500).json({ 
      error: '图片编辑失败', 
      message: error.message 
    });
  }
});

// 批量图片生成接口（用于 BeatSync 功能）
app.post('/api/generate-batch-images', upload.single('image'), async (req, res) => {
  try {
    const { prompts } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: '缺少图片文件' });
    }
    
    if (!prompts) {
      return res.status(400).json({ error: '缺少 prompts 参数' });
    }

    const promptArray = JSON.parse(prompts);
    console.log('批量图片生成请求:', { promptCount: promptArray.length, filename: imageFile.originalname });
    
    const results = await imageGenerationService.generateBatchStyledImages(imageFile, promptArray);
    
    res.json({
      success: true,
      images: results
    });
    
  } catch (error) {
    console.error('批量图片生成失败:', error);
    res.status(500).json({ 
      error: '批量图片生成失败', 
      message: error.message 
    });
  }
});

// 获取创意建议接口
app.post('/api/creative-suggestions', upload.single('image'), async (req, res) => {
  try {
    const { type } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: '缺少图片文件' });
    }
    
    if (!type || !['filter', 'adjustment', 'texture'].includes(type)) {
      return res.status(400).json({ error: '无效的建议类型' });
    }

    console.log('创意建议请求:', { type, filename: imageFile.originalname });
    
    const suggestions = await imageGenerationService.generateCreativeSuggestions(imageFile, type);
    
    res.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('获取创意建议失败:', error);
    res.status(500).json({ 
      error: '获取创意建议失败', 
      message: error.message 
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超出限制（最大 10MB）' });
    }
  }
  
  log('ERROR', '服务器错误', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: error.message 
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  log('INFO', 'AicePS 服务器启动成功');
  log('INFO', `服务器运行在端口 ${PORT}`);
  log('INFO', `健康检查: http://localhost:${PORT}/health`);
  log('INFO', `图片访问: http://localhost:${PORT}/images/`);
  log('INFO', `日志文件: /home/ec2-user/nanobanana/server/logs/server-${new Date().toISOString().split('T')[0]}.log`);
});