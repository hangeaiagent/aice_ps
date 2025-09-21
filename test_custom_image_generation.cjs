/**
 * 测试自定义图片生成功能
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🧪 测试自定义图片生成功能');
console.log('=' * 50);

// 检查Python脚本是否存在
const pythonScriptPath = path.resolve(__dirname, 'backend/custom_prompt_image_generator.py');
console.log('📂 Python脚本路径:', pythonScriptPath);

if (!fs.existsSync(pythonScriptPath)) {
    console.error('❌ Python脚本不存在:', pythonScriptPath);
    process.exit(1);
}

console.log('✅ Python脚本存在');

// 检查必要的目录
const dirs = [
    'server/uploads/temp',
    'server/uploads/custom-generated',
    'backend/output'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 创建目录:', dir);
    } else {
        console.log('✅ 目录存在:', dir);
    }
});

// 测试Python脚本的命令行接口
console.log('\n🐍 测试Python脚本命令行接口...');

const testProcess = spawn('python3', [
    pythonScriptPath,
    '--help'
], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let error = '';

testProcess.stdout.on('data', (data) => {
    output += data.toString();
});

testProcess.stderr.on('data', (data) => {
    error += data.toString();
});

testProcess.on('close', (code) => {
    if (code === 0 || output.includes('usage:') || output.includes('--image')) {
        console.log('✅ Python脚本命令行接口正常');
        console.log('📋 帮助信息:', output.substring(0, 200) + '...');
    } else {
        console.error('❌ Python脚本命令行接口异常');
        console.error('错误输出:', error);
    }
    
    // 测试API健康检查
    console.log('\n🌐 测试API健康检查...');
    testAPIHealth();
});

function testAPIHealth() {
    const http = require('http');
    
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/custom-image-generation/health',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('✅ API健康检查成功');
                console.log('📊 健康状态:', result);
            } catch (e) {
                console.error('❌ API健康检查响应解析失败:', e);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('❌ API健康检查失败:', e.message);
        console.log('💡 请确保后端服务器正在运行 (npm run server 或 node server/server.js)');
    });
    
    req.end();
}

console.log('\n💡 测试说明:');
console.log('1. 确保已安装Python依赖: pip install google-generativeai pillow');
console.log('2. 确保后端服务器正在运行: npm run server');
console.log('3. 确保在backend/custom_prompt_image_generator.py中配置了正确的API密钥');
console.log('4. 测试完成后，可以在浏览器中访问应用并测试聊天功能');
