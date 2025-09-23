import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testEnhancedGenerator() {
  console.log('🧪 测试增强版图片生成器...');
  
  // 创建测试图片
  console.log('📸 创建测试图片...');
  await createTestImage();
  
  const testImagePath = 'test_person.jpg';
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ 测试图片不存在');
    return;
  }
  
  const stats = fs.statSync(testImagePath);
  console.log(`✅ 使用测试图片: ${testImagePath} (${(stats.size/1024).toFixed(1)}KB)`);
  
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath));
    form.append('prompt', '让这个人穿上医生的白大褂，背景是医院');
    
    console.log('📤 发送请求到本地服务器...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3002/api/custom-image-generation', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer test-token' // 测试token
      },
      timeout: 120000 // 2分钟超时
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`📥 响应状态: ${response.status} (${responseTime}ms)`);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 图片生成成功!');
      console.log('🆔 任务ID:', result.task_id);
      console.log('🖼️ 原始图片URL:', result.original_image_url);
      console.log('🎨 生成图片URL:', result.custom_image_url);
      console.log('⏱️ 处理时间:', result.processing_time, '秒');
      console.log('💭 专业提示词:', result.professional_prompt?.substring(0, 200) + '...');
      
      // 测试生成的图片是否可以访问
      if (result.custom_image_url) {
        console.log('🔗 测试图片访问...');
        try {
          const imageResponse = await fetch(result.custom_image_url, { method: 'HEAD' });
          console.log(`🖼️ 图片访问状态: ${imageResponse.status}`);
        } catch (e) {
          console.log('⚠️ 图片访问测试失败:', e.message);
        }
      }
      
    } else {
      console.log('❌ 图片生成失败:', result.message);
      
      // 显示错误详情
      if (result.message && result.message.length > 200) {
        console.log('📋 错误详情:', result.message.substring(0, 500) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 清理测试文件
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('🗑️ 清理测试图片');
    }
  }
}

async function createTestImage() {
  const { execSync } = await import('child_process');
  
  try {
    execSync(`python3 -c "
from PIL import Image, ImageDraw
import os

# 创建一个300x400的测试图片
width, height = 300, 400
image = Image.new('RGB', (width, height), color='lightblue')
draw = ImageDraw.Draw(image)

# 绘制简单的人形
# 头部
draw.ellipse([120, 50, 180, 110], fill='peachpuff', outline='black', width=2)
# 身体
draw.rectangle([130, 110, 170, 200], fill='lightcoral', outline='black', width=2)
# 手臂
draw.rectangle([110, 120, 130, 170], fill='peachpuff', outline='black', width=2)
draw.rectangle([170, 120, 190, 170], fill='peachpuff', outline='black', width=2)
# 腿
draw.rectangle([135, 200, 155, 280], fill='blue', outline='black', width=2)
draw.rectangle([155, 200, 175, 280], fill='blue', outline='black', width=2)

# 保存为高质量JPEG
image.save('test_person.jpg', 'JPEG', quality=95)
print('✅ 创建有效的测试人物图片')
"`);
  } catch (error) {
    console.error('创建测试图片失败:', error.message);
  }
}

testEnhancedGenerator();
