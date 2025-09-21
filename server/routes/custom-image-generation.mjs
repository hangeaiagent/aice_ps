import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
const router = express.Router();

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
  console.log('🎨 收到自定义图片生成请求');
  
  try {
    const { prompt } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ 
        success: false, 
        message: '请上传图片文件' 
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供图片修改描述' 
      });
    }

    console.log('📋 请求参数:', {
      prompt: prompt.trim(),
      filename: imageFile.originalname,
      size: `${(imageFile.size / 1024).toFixed(1)}KB`,
      mimetype: imageFile.mimetype
    });

    // Python脚本路径
    const pythonScriptPath = path.resolve(__dirname, '../../backend/custom_prompt_image_generator.py');
    const inputImagePath = path.resolve(imageFile.path);
    const outputDir = path.resolve(__dirname, '../uploads/custom-generated');
    
    console.log('📂 文件路径:', {
      pythonScript: pythonScriptPath,
      inputImage: inputImagePath,
      outputDir: outputDir
    });

    // 检查Python脚本是否存在
    if (!fs.existsSync(pythonScriptPath)) {
      console.error('❌ Python脚本不存在:', pythonScriptPath);
      return res.status(500).json({
        success: false,
        message: 'Python脚本文件不存在，请检查backend/custom_prompt_image_generator.py'
      });
    }

    // 检查输入图片是否存在
    if (!fs.existsSync(inputImagePath)) {
      console.error('❌ 输入图片不存在:', inputImagePath);
      return res.status(500).json({
        success: false,
        message: '上传的图片文件不存在'
      });
    }

    console.log('🐍 启动Python脚本...');

    // 调用Python脚本
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      '--image', inputImagePath,
      '--prompt', prompt.trim(),
      '--output-dir', outputDir
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.dirname(pythonScriptPath) }
    });

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      pythonOutput += output;
      console.log('🐍 Python输出:', output.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      pythonError += error;
      console.error('🐍 Python错误:', error.trim());
    });

    pythonProcess.on('close', (code) => {
      console.log(`🐍 Python脚本执行完成，退出代码: ${code}`);
      
      // 清理临时文件
      fs.unlink(inputImagePath, (err) => {
        if (err) console.error('清理临时文件失败:', err);
        else console.log('✅ 临时文件已清理');
      });

      if (code === 0) {
        try {
          console.log('📄 Python完整输出:', pythonOutput);
          
          // 尝试解析JSON结果
          const jsonLines = pythonOutput.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('{') && trimmed.includes('success');
          });

          if (jsonLines.length === 0) {
            console.error('❌ 未找到有效的JSON输出');
            return res.status(500).json({
              success: false,
              message: 'Python脚本未返回有效结果'
            });
          }

          const result = JSON.parse(jsonLines[0]);
          console.log('📊 解析的结果:', result);

          if (result.success && result.custom_image) {
            // 将生成的图片移动到公共目录
            const timestamp = Date.now();
            const filename = `custom_${timestamp}.png`;
            const publicPath = path.join(__dirname, '../uploads/', filename);
            
            console.log('📁 移动文件:', {
              from: result.custom_image,
              to: publicPath
            });

            fs.copyFile(result.custom_image, publicPath, (err) => {
              if (err) {
                console.error('❌ 移动文件失败:', err);
                return res.status(500).json({
                  success: false,
                  message: '保存生成图片失败'
                });
              }

              console.log('✅ 图片已保存到:', publicPath);

              // 返回成功结果
              res.json({
                success: true,
                message: '图片定制生成成功',
                custom_image_url: `/images/${filename}`,
                professional_prompt: result.professional_prompt || '专业提示词生成中...',
                processing_time: result.processing_time || 0,
                user_prompt: prompt.trim()
              });
            });
          } else {
            console.error('❌ Python脚本执行失败:', result);
            res.status(500).json({
              success: false,
              message: result.message || 'Python脚本执行失败'
            });
          }
        } catch (parseError) {
          console.error('❌ 解析Python输出失败:', parseError);
          console.error('原始输出:', pythonOutput);
          res.status(500).json({
            success: false,
            message: '解析生成结果失败，请检查Python脚本输出格式'
          });
        }
      } else {
        console.error('❌ Python脚本执行失败，退出代码:', code);
        console.error('错误输出:', pythonError);
        res.status(500).json({
          success: false,
          message: `图片生成失败: ${pythonError || '未知错误'}`
        });
      }
    });

    // 处理Python进程错误
    pythonProcess.on('error', (error) => {
      console.error('❌ 启动Python进程失败:', error);
      res.status(500).json({
        success: false,
        message: `启动Python进程失败: ${error.message}`
      });
    });

  } catch (error) {
    console.error('❌ 自定义图片生成失败:', error);
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
