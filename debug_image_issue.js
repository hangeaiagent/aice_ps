import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function debugImageGeneration() {
  console.log('🔍 调试图片生成问题...');
  
  // 测试不同的场景
  const testCases = [
    {
      name: '正常图片测试',
      imageSize: 'normal',
      prompt: '让这个人穿上医生的白大褂，背景是医院'
    },
    {
      name: '空提示词测试',
      imageSize: 'normal', 
      prompt: ''
    },
    {
      name: '超大图片测试',
      imageSize: 'large',
      prompt: '让这个人穿上商务装'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 测试场景: ${testCase.name}`);
    
    try {
      // 创建测试图片
      let imageBuffer;
      if (testCase.imageSize === 'normal') {
        // 创建一个合理大小的测试图片
        imageBuffer = await createTestImage(300, 400);
      } else if (testCase.imageSize === 'large') {
        // 创建一个大图片
        imageBuffer = await createTestImage(1200, 1600);
      }
      
      const testImagePath = `test_${testCase.imageSize}.jpg`;
      fs.writeFileSync(testImagePath, imageBuffer);
      
      const stats = fs.statSync(testImagePath);
      console.log(`📊 测试图片: ${testImagePath} (${(stats.size/1024).toFixed(1)}KB)`);
      
      // 发送请求
      const form = new FormData();
      form.append('image', fs.createReadStream(testImagePath));
      form.append('prompt', testCase.prompt);
      
      console.log('📤 发送请求...');
      const startTime = Date.now();
      
      const response = await fetch('https://nanobanana.gitagent.io/api/custom-image-generation', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        timeout: 30000 // 30秒超时
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`📥 响应状态: ${response.status} (${responseTime}ms)`);
      
      const result = await response.json();
      console.log('📥 响应结果:', JSON.stringify(result, null, 2));
      
      if (result.success && result.custom_image_url) {
        // 测试生成的图片是否可以访问
        const imageUrl = `https://nanobanana.gitagent.io${result.custom_image_url}`;
        console.log('🔗 测试图片访问:', imageUrl);
        
        const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
        console.log(`🖼️ 图片访问状态: ${imageResponse.status}`);
        
        if (imageResponse.status === 200) {
          const contentLength = imageResponse.headers.get('content-length');
          if (contentLength) {
            const sizeKB = (parseInt(contentLength) / 1024).toFixed(1);
            console.log(`📏 图片大小: ${sizeKB}KB`);
            
            if (parseInt(contentLength) < 10000) {
              console.log('⚠️ 警告: 图片文件太小，可能有问题');
            }
          }
        }
      }
      
      // 清理测试文件
      fs.unlinkSync(testImagePath);
      
    } catch (error) {
      console.error(`❌ 测试失败 (${testCase.name}):`, error.message);
    }
    
    console.log('─'.repeat(50));
  }
}

async function createTestImage(width, height) {
  // 创建一个简单的JPEG图片缓冲区
  // 这是一个最小的JPEG文件头
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08
  ]);
  
  // 添加图片尺寸信息
  const heightBytes = Buffer.from([(height >> 8) & 0xFF, height & 0xFF]);
  const widthBytes = Buffer.from([(width >> 8) & 0xFF, width & 0xFF]);
  
  const jpegEnd = Buffer.from([
    0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xDA,
    0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00,
    0xB2, 0xC0, 0x07, 0xFF, 0xD9
  ]);
  
  // 创建一些填充数据使文件更大
  const fillSize = Math.max(1000, Math.floor((width * height) / 100));
  const fillData = Buffer.alloc(fillSize, 0x80);
  
  return Buffer.concat([jpegHeader, heightBytes, widthBytes, fillData, jpegEnd]);
}

debugImageGeneration().catch(console.error);
