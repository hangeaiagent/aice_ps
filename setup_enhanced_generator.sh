#!/bin/bash
# 增强版图片生成器安装脚本

echo "🚀 开始安装增强版图片生成器..."

# 检查Python版本
echo "📋 检查Python版本..."
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Python3未安装，请先安装Python3"
    exit 1
fi

# 安装Python依赖
echo "📦 安装Python依赖..."
cd backend
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Python依赖安装失败"
    exit 1
fi

# 检查环境变量
echo "🔧 检查环境变量配置..."
cd ..
if [ ! -f ".env" ]; then
    echo "⚠️ 未找到.env文件，请创建并配置以下环境变量："
    echo "  - GEMINI_API_KEY"
    echo "  - AWS_ACCESS_KEY_ID"
    echo "  - AWS_SECRET_ACCESS_KEY"
    echo "  - S3_BUCKET_NAME"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - SUPABASE_DB_PASSWORD"
    echo ""
    echo "📝 可以参考.env.example文件"
else
    echo "✅ 找到.env文件"
fi

# 测试Python脚本
echo "🧪 测试Python脚本..."
python3 backend/enhanced_image_generator.py --help
if [ $? -ne 0 ]; then
    echo "❌ Python脚本测试失败"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p backend/output
mkdir -p server/uploads/custom-generated
mkdir -p server/logs

echo "✅ 增强版图片生成器安装完成！"
echo ""
echo "📋 下一步："
echo "1. 配置.env文件中的环境变量"
echo "2. 确保数据库表已创建"
echo "3. 重启服务器测试功能"
echo ""
echo "🔗 测试命令："
echo "curl -X POST http://localhost:3002/api/custom-image-generation \\"
echo "  -F 'image=@your_image.jpg' \\"
echo "  -F 'prompt=让这个人穿上医生的白大褂'"
