import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

async function testImageGeneration() {
  console.log('🧪 开始测试图片生成功能...');
  
  // 使用真实的测试图片
  const testImagePath = 'test_person.jpg';
  
  // 检查测试图片是否存在
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ 测试图片不存在，请先运行: python3 create_test_image.py');
    return;
  }
  
  const stats = fs.statSync(testImagePath);
  console.log('✅ 使用测试图片:', testImagePath, `(${(stats.size/1024).toFixed(1)}KB)`);
  
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath));
    form.append('prompt', '让这个人穿上医生的白大褂，背景是医院');
    
    console.log('📤 发送请求到生产服务器...');
    
    const response = await fetch('https://nanobanana.gitagent.io/api/custom-image-generation', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应结果:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 图片生成成功!');
      console.log('🖼️ 图片URL:', result.custom_image_url);
    } else {
      console.log('❌ 图片生成失败:', result.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
  
  // 保留测试文件供后续使用
  console.log('📁 测试图片保留:', testImagePath);
}

testImageGeneration();
