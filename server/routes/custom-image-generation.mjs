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

// 自定义图片生成接口
router.post('/custom-image-generation', upload.single('image'), async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.info('收到自定义图片生成请求', { requestId });
  
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

    // Python脚本路径
    const pythonScriptPath = path.resolve(__dirname, '../../backend/custom_prompt_image_generator.py');
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
        message: 'Python脚本文件不存在，请检查backend/custom_prompt_image_generator.py'
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
          
          // 尝试解析JSON结果
          const jsonLines = pythonOutput.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('{') && trimmed.includes('success');
          });

          logger.info('JSON行过滤结果', { requestId, jsonLinesCount: jsonLines.length, jsonLines });

          if (jsonLines.length === 0) {
            logger.error('未找到有效的JSON输出', { requestId, fullOutput: pythonOutput });
            return res.status(500).json({
              success: false,
              message: 'Python脚本未返回有效结果'
            });
          }

          const result = JSON.parse(jsonLines[0]);
          logger.info('解析的结果', { requestId, result });

          if (result.success && result.custom_image) {
            // 检查生成的图片文件是否存在
            if (!fs.existsSync(result.custom_image)) {
              logger.error('生成的图片文件不存在', { requestId, imagePath: result.custom_image });
              return res.status(500).json({
                success: false,
                message: '生成的图片文件不存在'
              });
            }

            // 检查生成的图片文件大小
            const generatedStats = fs.statSync(result.custom_image);
            logger.info('生成的图片文件信息', { 
              requestId, 
              imagePath: result.custom_image,
              size: generatedStats.size, 
              sizeKB: `${(generatedStats.size / 1024).toFixed(1)}KB` 
            });

            // 将生成的图片移动到公共目录
            const timestamp = Date.now();
            const filename = `custom_${timestamp}.png`;
            const publicPath = path.join(__dirname, '../uploads/', filename);
            
            logger.info('准备移动文件', { requestId, from: result.custom_image, to: publicPath });

            fs.copyFile(result.custom_image, publicPath, (err) => {
              if (err) {
                logger.error('移动文件失败', { requestId, error: err.message });
                return res.status(500).json({
                  success: false,
                  message: '保存生成图片失败'
                });
              }

              // 验证复制后的文件
              const copiedStats = fs.statSync(publicPath);
              logger.info('图片复制完成', { 
                requestId, 
                publicPath, 
                size: copiedStats.size, 
                sizeKB: `${(copiedStats.size / 1024).toFixed(1)}KB` 
              });

              // 返回成功结果
              const successResponse = {
                success: true,
                message: '图片定制生成成功',
                custom_image_url: `/images/${filename}`,
                professional_prompt: result.professional_prompt || '专业提示词生成中...',
                processing_time: result.processing_time || 0,
                user_prompt: prompt.trim()
              };
              
              logger.info('返回成功响应', { requestId, response: successResponse });
              res.json(successResponse);
            });
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

// 健康检查接口
router.get('/custom-image-generation/health', (req, res) => {
  const pythonScriptPath = path.resolve(__dirname, '../../backend/custom_prompt_image_generator.py');
  const scriptExists = fs.existsSync(pythonScriptPath);
  
  res.json({
    status: 'ok',
    pythonScript: {
      path: pythonScriptPath,
      exists: scriptExists
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
