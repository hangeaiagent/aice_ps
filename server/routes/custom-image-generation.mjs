import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Logger from '../utils/logger.js';

// ES模块中__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// 创建日志记录器
const logger = new Logger('CUSTOM_IMAGE_GEN');

// 配置文件上传
const upload = multer({
  dest: 'server/uploads/temp/',
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

// 确保必要的目录存在
const ensureDirectories = () => {
  const dirs = [
    'server/uploads/temp',
    'server/uploads/custom-generated',
    'backend/output'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`创建目录: ${dir}`);
    }
  });
};

// 初始化目录
ensureDirectories();

// 用户认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 如果没有认证，设置为匿名用户
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    // 这里可以添加JWT验证逻辑
    // 暂时跳过验证，直接设置用户ID
    req.user = { id: 'anonymous' };
    next();
  } catch (error) {
    logger.warn('用户认证失败', { error: error.message });
    req.user = null;
    next();
  }
};

// 自定义图片生成接口
router.post('/custom-image-generation', authenticateUser, upload.single('image'), async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.user ? req.user.id : null;
  logger.info('收到自定义图片生成请求', { requestId, userId });
  
  try {
    const { prompt } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      logger.warn('请求缺少图片文件', { requestId });
      return res.status(400).json({ 
        success: false, 
        message: '请上传图片文件' 
      });
    }

    if (!prompt || !prompt.trim()) {
      logger.warn('请求缺少提示词', { requestId, prompt });
      return res.status(400).json({ 
        success: false, 
        message: '请提供图片修改描述' 
      });
    }

    const requestParams = {
      requestId,
      prompt: prompt.trim(),
      filename: imageFile.originalname,
      size: `${(imageFile.size / 1024).toFixed(1)}KB`,
      mimetype: imageFile.mimetype,
      tempPath: imageFile.path
    };
    logger.info('请求参数验证通过', requestParams);

    // Python脚本路径 - 使用增强版脚本
    const pythonScriptPath = path.resolve(__dirname, '../../backend/enhanced_image_generator.py');
    const inputImagePath = path.resolve(imageFile.path);
    const outputDir = path.resolve(__dirname, '../uploads/custom-generated');
    
    const filePaths = {
      requestId,
      pythonScript: pythonScriptPath,
      inputImage: inputImagePath,
      outputDir: outputDir
    };
    logger.info('文件路径配置', filePaths);

    // 检查Python脚本是否存在
    if (!fs.existsSync(pythonScriptPath)) {
      logger.error('Python脚本不存在', { requestId, pythonScriptPath });
      return res.status(500).json({
        success: false,
        message: 'Python脚本文件不存在，请检查backend/enhanced_image_generator.py'
      });
    }

    // 检查输入图片是否存在
    if (!fs.existsSync(inputImagePath)) {
      logger.error('输入图片不存在', { requestId, inputImagePath });
      return res.status(500).json({
        success: false,
        message: '上传的图片文件不存在'
      });
    }

    // 检查输入图片文件大小
    const inputStats = fs.statSync(inputImagePath);
    logger.info('输入图片文件信息', { 
      requestId, 
      size: inputStats.size, 
      sizeKB: `${(inputStats.size / 1024).toFixed(1)}KB` 
    });

    logger.info('启动Python脚本', { requestId });

    // 调用Python脚本
    const pythonArgs = [
      pythonScriptPath,
      '--image', inputImagePath,
      '--prompt', prompt.trim(),
      '--output-dir', outputDir
    ];
    
    // 如果有用户ID，添加到参数中
    if (userId) {
      pythonArgs.push('--user-id', userId);
    }
    
    logger.info('Python脚本参数', { requestId, args: pythonArgs });

    const pythonProcess = spawn('python3', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.dirname(pythonScriptPath) }
    });

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      pythonOutput += output;
      logger.debug('Python标准输出', { requestId, output: output.trim() });
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      pythonError += error;
      logger.warn('Python错误输出', { requestId, error: error.trim() });
    });

    pythonProcess.on('close', (code) => {
      logger.info('Python脚本执行完成', { requestId, exitCode: code });
      
      // 清理临时文件
      fs.unlink(inputImagePath, (err) => {
        if (err) {
          logger.warn('清理临时文件失败', { requestId, error: err.message });
        } else {
          logger.info('临时文件已清理', { requestId });
        }
      });

      if (code === 0) {
        try {
          logger.info('Python完整输出', { requestId, output: pythonOutput });
          
          // 查找JSON结果标记
          const jsonStartMarker = 'JSON_RESULT_START';
          const jsonEndMarker = 'JSON_RESULT_END';
          
          const startIndex = pythonOutput.indexOf(jsonStartMarker);
          const endIndex = pythonOutput.indexOf(jsonEndMarker);
          
          if (startIndex === -1 || endIndex === -1) {
            logger.error('未找到JSON标记', { requestId, hasStart: startIndex !== -1, hasEnd: endIndex !== -1 });
            return res.status(500).json({
              success: false,
              message: 'Python脚本未返回有效的JSON结果'
            });
          }
          
          const jsonString = pythonOutput.substring(startIndex + jsonStartMarker.length, endIndex).trim();
          logger.info('提取的JSON字符串', { requestId, jsonLength: jsonString.length, jsonPreview: jsonString.substring(0, 200) });
          
          let result;
          try {
            result = JSON.parse(jsonString);
          } catch (parseError) {
            logger.error('JSON解析失败', { requestId, error: parseError.message, jsonString: jsonString.substring(0, 500) });
            return res.status(500).json({
              success: false,
              message: 'Python脚本返回的结果格式错误'
            });
          }
          logger.info('解析的结果', { requestId, result });

          if (result.success) {
            // 新的Python脚本已经处理了S3上传和数据库记录
            const successResponse = {
              success: true,
              message: result.message || '图片定制生成成功',
              task_id: result.task_id,
              custom_image_url: result.generated_image_url || result.custom_image_url,
              original_image_url: result.original_image_url,
              professional_prompt: result.professional_prompt || '专业提示词生成中...',
              processing_time: result.processing_time || 0,
              user_prompt: prompt.trim()
            };
            
            logger.info('返回成功响应', { requestId, response: successResponse });
            res.json(successResponse);
          } else {
            logger.error('Python脚本执行失败', { requestId, result });
            res.status(500).json({
              success: false,
              message: result.message || 'Python脚本执行失败'
            });
          }
        } catch (parseError) {
          logger.error('解析Python输出失败', { requestId, error: parseError.message, rawOutput: pythonOutput });
          res.status(500).json({
            success: false,
            message: '解析生成结果失败，请检查Python脚本输出格式'
          });
        }
      } else {
        logger.error('Python脚本执行失败', { requestId, exitCode: code, errorOutput: pythonError });
        res.status(500).json({
          success: false,
          message: `图片生成失败: ${pythonError || '未知错误'}`
        });
      }
    });

    // 处理Python进程错误
    pythonProcess.on('error', (error) => {
      logger.error('启动Python进程失败', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        message: `启动Python进程失败: ${error.message}`
      });
    });

  } catch (error) {
    logger.error('自定义图片生成异常', { requestId: requestId || 'unknown', error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

// 纯文本到图片生成接口（用于漫画生成）
router.post('/custom-image-generation/generate', authenticateUser, async (req, res) => {
  const requestId = `txt2img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.user ? req.user.id : null;
  
  console.log(`[${requestId}] 🖼️ 文本生成图片请求开始`, {
    API接口: '/api/custom-image-generation/generate',
    用户ID: userId,
    时间戳: new Date().toISOString()
  });
  
  logger.info('收到文本到图片生成请求', { requestId, userId });
  
  try {
    const { 
      prompt, 
      negative_prompt = '', 
      width = 512, 
      height = 512, 
      num_inference_steps = 20, 
      guidance_scale = 7.5, 
      seed = -1 
    } = req.body;

    if (!prompt || !prompt.trim()) {
      console.error(`[${requestId}] ❌ 请求参数错误: 缺少提示词`, { prompt });
      logger.warn('请求缺少提示词', { requestId, prompt });
      return res.status(400).json({ 
        success: false, 
        message: '请提供图片生成描述',
        requestId 
      });
    }

    const requestParams = {
      requestId,
      prompt: prompt.trim(),
      negative_prompt,
      width,
      height,
      num_inference_steps,
      guidance_scale,
      seed
    };
    
    console.log(`[${requestId}] ✅ 请求参数验证通过`, {
      提示词长度: prompt.trim().length,
      负面提示词长度: negative_prompt.length,
      图片尺寸: `${width}x${height}`,
      推理步数: num_inference_steps,
      引导强度: guidance_scale,
      随机种子: seed,
      提示词预览: prompt.trim().substring(0, 100) + (prompt.trim().length > 100 ? '...' : '')
    });
    
    logger.info('文本生成请求参数验证通过', requestParams);

    // Python脚本路径 - 使用专门的文本生成图片脚本
    const pythonScriptPath = path.resolve(__dirname, '../../backend/text_to_image_generator.py');
    const outputDir = path.resolve(__dirname, '../uploads/custom-generated');
    
    console.log(`[${requestId}] 📁 文件路径配置`, {
      Python脚本: pythonScriptPath,
      输出目录: outputDir,
      脚本存在: fs.existsSync(pythonScriptPath),
      输出目录存在: fs.existsSync(outputDir)
    });
    
    // 检查Python脚本是否存在
    if (!fs.existsSync(pythonScriptPath)) {
      console.error(`[${requestId}] ❌ Python脚本不存在`, { pythonScriptPath });
      logger.error('Python脚本不存在', { requestId, pythonScriptPath });
      return res.status(500).json({
        success: false,
        message: 'AI图片生成脚本不存在，请检查backend/text_to_image_generator.py文件',
        requestId,
        scriptPath: pythonScriptPath
      });
    }

    // 生成输出文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFilename = `comic_${timestamp}_${requestId.slice(-6)}.jpg`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`[${requestId}] 🚀 准备执行Python脚本`, { 
      脚本路径: pythonScriptPath, 
      输出路径: outputPath,
      输出文件名: outputFilename
    });
    
    logger.info('开始执行Python脚本', { 
      requestId, 
      pythonScriptPath, 
      outputPath,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    });

    // 构建Python命令参数（纯文本生成模式）
    const pythonArgs = [
      pythonScriptPath,
      '--mode', 'text2img',  // 纯文本生成模式
      '--prompt', prompt,
      '--output', outputPath,
      '--width', width.toString(),
      '--height', height.toString(),
      '--steps', num_inference_steps.toString(),
      '--guidance', guidance_scale.toString()
    ];

    if (negative_prompt) {
      pythonArgs.push('--negative_prompt', negative_prompt);
    }
    
    if (seed > 0) {
      pythonArgs.push('--seed', seed.toString());
    }
    
    console.log(`[${requestId}] 📋 Python脚本参数`, {
      命令: 'python3',
      参数: pythonArgs.map((arg, i) => i % 2 === 0 ? arg : (arg.length > 50 ? arg.substring(0, 50) + '...' : arg))
    });

    // 执行Python脚本
    const pythonProcess = spawn('python3', pythonArgs, {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[${requestId}] 📤 Python标准输出:`, output.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.warn(`[${requestId}] ⚠️ Python错误输出:`, error.trim());
    });

    pythonProcess.on('close', (code) => {
      console.log(`[${requestId}] 🏁 Python脚本执行完成`, { 
        退出码: code,
        输出文件存在: fs.existsSync(outputPath),
        标准输出长度: stdout.length,
        错误输出长度: stderr.length
      });
      
      logger.info('Python脚本执行完成', { 
        requestId, 
        exitCode: code,
        stdout: stdout.substring(0, 500),
        stderr: stderr.substring(0, 500)
      });

      if (code === 0 && fs.existsSync(outputPath)) {
        // 成功生成图片
        const imageUrl = `/api/custom-image-generation/image/${outputFilename}`;
        
        console.log(`[${requestId}] ✅ 图片生成成功`, {
          图片URL: imageUrl,
          输出路径: outputPath,
          文件大小: `${(fs.statSync(outputPath).size / 1024).toFixed(1)}KB`
        });
        
        logger.info('图片生成成功', { requestId, imageUrl, outputPath });
        
        res.json({
          success: true,
          message: '图片生成成功',
          imageUrl: imageUrl,
          filename: outputFilename,
          requestId: requestId
        });
      } else {
        // 生成失败
        console.error(`[${requestId}] ❌ 图片生成失败`, { 
          退出码: code, 
          错误输出: stderr,
          输出文件存在: fs.existsSync(outputPath),
          完整标准输出: stdout,
          完整错误输出: stderr
        });
        
        logger.error('图片生成失败', { 
          requestId, 
          exitCode: code, 
          stderr,
          outputExists: fs.existsSync(outputPath)
        });
        
        res.status(500).json({
          success: false,
          message: `AI图片生成失败 (退出码: ${code})`,
          error: stderr || stdout || '未知错误',
          requestId: requestId,
          details: 'Python脚本执行失败，请检查text_to_image_generator.py脚本和依赖'
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`[${requestId}] ❌ Python进程启动失败`, {
        错误信息: error.message,
        错误类型: error.name,
        错误堆栈: error.stack
      });
      
      logger.error('Python进程启动失败', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Python进程启动失败',
        error: error.message,
        requestId: requestId,
        details: '请检查Python3是否已安装且text_to_image_generator.py文件存在'
      });
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ 文本生成图片请求处理异常`, {
      错误信息: error.message,
      错误类型: error.name,
      错误堆栈: error.stack
    });
    
    logger.error('文本生成图片请求处理失败', { 
      requestId, 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message,
      requestId: requestId,
      details: '请联系管理员检查服务器配置'
    });
  }
});

// 健康检查接口
router.get('/custom-image-generation/health', (req, res) => {
  const healthCheckId = `health_${Date.now()}`;
  
  console.log(`[${healthCheckId}] 🏥 图片生成服务健康检查开始`, {
    API接口: '/api/custom-image-generation/health',
    时间戳: new Date().toISOString()
  });
  
  const pythonScriptPath = path.resolve(__dirname, '../../backend/text_to_image_generator.py');
  const scriptExists = fs.existsSync(pythonScriptPath);
  
  const healthData = {
    status: 'ok',
    pythonScript: {
      path: pythonScriptPath,
      exists: scriptExists
    },
    timestamp: new Date().toISOString(),
    service: 'custom-image-generation',
    version: '1.0.0'
  };
  
  console.log(`[${healthCheckId}] ✅ 健康检查完成`, {
    返回内容: healthData,
    Python脚本存在: scriptExists
  });
  
  res.json(healthData);
});

export default router;
