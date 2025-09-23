import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function finalTest() {
  console.log('🧪 最终测试 - 使用有效的图片...');
  
  const testImagePath = 'valid_test_person.jpg';
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ 测试图片不存在，请先运行Python脚本创建图片');
    return;
  }
  
  const stats = fs.statSync(testImagePath);
  console.log(`✅ 使用测试图片: ${testImagePath} (${(stats.size/1024).toFixed(1)}KB)`);
  
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath));
    form.append('prompt', '让这个人穿上医生的白大褂，背景是医院');
    
    console.log('📤 发送请求到生产服务器...');
    const startTime = Date.now();
    
    const response = await fetch('https://nanobanana.gitagent.io/api/custom-image-generation', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 60000 // 60秒超时
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`📥 响应状态: ${response.status} (${responseTime}ms)`);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 图片生成成功!');
      console.log('🖼️ 图片URL:', result.custom_image_url);
      console.log('⏱️ 处理时间:', result.processing_time, '秒');
      console.log('💭 专业提示词:', result.professional_prompt.substring(0, 200) + '...');
      
      // 测试生成的图片
      const imageUrl = `https://nanobanana.gitagent.io${result.custom_image_url}`;
      console.log('🔗 测试图片访问:', imageUrl);
      
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
      console.log(`🖼️ 图片访问状态: ${imageResponse.status}`);
      
      if (imageResponse.status === 200) {
        const contentLength = imageResponse.headers.get('content-length');
        if (contentLength) {
          const sizeKB = (parseInt(contentLength) / 1024).toFixed(1);
          console.log(`📏 生成图片大小: ${sizeKB}KB`);
          
          if (parseInt(contentLength) > 100000) {
            console.log('✅ 图片大小正常，生成成功！');
          } else {
            console.log('⚠️ 警告: 图片文件较小，可能有问题');
          }
        }
      }
      
    } else {
      console.log('❌ 图片生成失败:', result.message);
      
      // 如果失败，显示错误的前200个字符
      if (result.message && result.message.length > 200) {
        console.log('📋 错误详情:', result.message.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

finalTest();
