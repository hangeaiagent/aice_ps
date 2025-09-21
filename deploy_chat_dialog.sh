#!/bin/bash

echo "🚀 部署AI图片定制对话框功能"
echo "=================================="

# 检查必要文件
echo "📋 检查必要文件..."

files=(
    "components/ChatDialog.tsx"
    "server/routes/custom-image-generation.js"
    "backend/custom_prompt_image_generator.py"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done

# 检查Python依赖
echo -e "\n🐍 检查Python依赖..."
python3 -c "import google.generativeai, PIL" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Python依赖已安装"
else
    echo "❌ Python依赖缺失，正在安装..."
    pip3 install google-generativeai pillow
fi

# 创建必要目录
echo -e "\n📁 创建必要目录..."
mkdir -p server/uploads/temp
mkdir -p server/uploads/custom-generated
mkdir -p backend/output

echo "✅ 目录创建完成"

# 检查API密钥配置
echo -e "\n🔑 检查API密钥配置..."
if grep -q "AIzaSyC3fc8-5r4SWOISs0IIduiE4TOvE8-aFC0" backend/custom_prompt_image_generator.py; then
    echo "⚠️  检测到示例API密钥，请确保配置了正确的Gemini API密钥"
else
    echo "✅ API密钥配置检查完成"
fi

# 运行测试
echo -e "\n🧪 运行功能测试..."
node test_custom_image_generation.js

echo -e "\n✅ 部署完成！"
echo -e "\n📝 使用说明:"
echo "1. 启动后端服务器: npm run server 或 node server/server.js"
echo "2. 启动前端服务器: npm run dev"
echo "3. 在浏览器中访问应用"
echo "4. 点击绿色的聊天按钮打开AI图片定制助手"
echo "5. 上传人物照片并描述想要的效果"

echo -e "\n🎯 功能特点:"
echo "• 类似Claude.ai的对话界面"
echo "• 支持图片上传和文本输入"
echo "• 基于Gemini 2.5 Flash的专业图片定制"
echo "• 两阶段生成：分析+定制"
echo "• 支持下载和重新生成"
echo "• 实时对话体验"

echo -e "\n🔧 故障排除:"
echo "• 如果Python脚本执行失败，检查API密钥配置"
echo "• 如果图片生成失败，检查网络连接和API配额"
echo "• 如果聊天按钮不显示，检查前端编译是否成功"
echo "• 如果API调用失败，检查后端服务器是否正在运行"
