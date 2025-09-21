# ****************************
# 两阶段AI自定义提示词批图生成脚本
# 第一阶段：结合用户提示词分析人物照片，生成专业的图像生成提示词
# 第二阶段：基于分析结果和生成的提示词对人物进行定制化处理
# ****************************

import google.generativeai as genai
from PIL import Image
from io import BytesIO
from datetime import datetime
import os
import base64
import json
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 配置 API 密钥
api_key = "AIzaSyC3fc8-5r4SWOISs0IIduiE4TOvE8-aFC0"
genai.configure(api_key=api_key)

# 使用支持图片生成的模型
model = genai.GenerativeModel('gemini-2.5-flash-image-preview')

class CustomPromptImageGenerator:
    """自定义提示词图像生成器"""
    
    def __init__(self):
        self.output_dir = "/app/thy_test/18.pi_tu_generate_prompt/根据用户提示词为用户批图/output"
        os.makedirs(self.output_dir, exist_ok=True)
        
    def stage1_analyze_with_user_prompt(self, portrait_path: str, user_prompt: str) -> str:
        """第一阶段：结合用户提示词分析人物照片，生成专业的图像生成提示词"""
        logger.info("🔍 第一阶段：结合用户需求分析照片，生成专业提示词...")
        
        if not os.path.exists(portrait_path):
            raise FileNotFoundError(f"人像照片未找到: {portrait_path}")
        
        try:
            portrait_image = Image.open(portrait_path)
            logger.info(f"人像照片已加载: {portrait_path}")
            logger.info(f"用户提示词: {user_prompt}")
            
            # 结合用户需求的分析提示词
            analysis_prompt = f"""专业图像生成分析师任务：基于用户的具体需求，分析此人物照片并生成专业的图像生成提示词。

**用户需求**: {user_prompt}

请仔细分析这张人物照片，结合用户的具体需求，生成一个详细的专业提示词用于AI图像生成。

**分析步骤**：

1. **人物特征识别**：
   - 详细描述人物的面部特征、体型、发型等
   - 识别人物的性别、年龄段、种族特征
   - 分析当前的服装、姿势、表情
   - 记录需要保持的身份特征

2. **用户需求理解**：
   - 解析用户想要的具体效果或变化
   - 理解用户的风格偏好和目标
   - 识别需要改变的具体方面
   - 确定保持不变的核心特征

3. **技术实现分析**：
   - 评估如何在保持身份的前提下实现用户需求
   - 分析需要的光线、角度、背景设置
   - 确定合适的艺术风格或摄影风格
   - 规划色彩搭配和整体构图

4. **专业提示词生成**：
   - 结合人物特征和用户需求
   - 生成技术性强、描述详细的英文提示词
   - 确保提示词能够准确指导AI生成期望效果
   - 平衡创意实现和身份保持

**输出要求**：
请生成一个完整的英文提示词，用于AI图像生成模型根据用户需求对人物进行处理。提示词应该：
- 准确描述人物的核心身份特征（必须保持）
- 清晰表达用户的具体需求和期望效果
- 包含技术细节（光线、构图、风格等）
- 确保生成结果既满足用户需求又保持人物身份
- 使用专业的图像生成术语和描述

格式：直接输出完整的英文提示词，用于第二阶段的图像生成。

注意：
- 必须保持人物的基本身份特征和面部特征
- 在满足用户需求的同时确保结果自然真实
- 避免生成不合适或有害的内容
- 如果用户需求不合理，请在提示词中进行适当调整"""

            # 使用文本分析模型
            text_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            response = text_model.generate_content([analysis_prompt, portrait_image])
            
            analysis_result = response.text
            logger.info("✅ 自定义需求分析完成")
            logger.info(f"📝 生成的专业提示词长度: {len(analysis_result)} 字符")
            
            # 保存分析结果
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            analysis_file = os.path.join(self.output_dir, f"custom_analysis_{timestamp}.txt")
            with open(analysis_file, 'w', encoding='utf-8') as f:
                f.write(f"自定义提示词图像生成分析报告\n")
                f.write(f"分析时间: {datetime.now()}\n")
                f.write(f"源照片: {portrait_path}\n")
                f.write(f"用户需求: {user_prompt}\n")
                f.write("="*50 + "\n\n")
                f.write("生成的专业提示词:\n")
                f.write(analysis_result)
            
            logger.info(f"📄 自定义分析已保存: {analysis_file}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"❌ 自定义需求分析失败: {e}")
            raise
    
    def stage2_generate_custom_image(self, portrait_path: str, professional_prompt: str, user_prompt: str) -> str:
        """第二阶段：基于专业提示词生成用户定制的图像"""
        logger.info("🎨 第二阶段：生成用户定制的图像...")
        
        if not os.path.exists(portrait_path):
            raise FileNotFoundError(f"人像照片未找到: {portrait_path}")
        
        try:
            portrait_image = Image.open(portrait_path)
            if portrait_image.mode != 'RGB':
                portrait_image = portrait_image.convert('RGB')
                
            logger.info(f"原始照片已加载: {portrait_path}")
            
            # 定制化生成的核心提示词
            synthesis_prompt = f"""CUSTOM IMAGE GENERATION TASK

USER REQUEST: {user_prompt}

IDENTITY PRESERVATION (CRITICAL):
- MUST maintain the person's core identity and recognizable facial features
- Keep the same person's basic facial structure and unique characteristics
- Preserve natural proportions and individual uniqueness
- The result must be recognizable as the same person

PROFESSIONAL GENERATION SPECIFICATIONS:
{professional_prompt}

GENERATION GUIDELINES:
✅ ALLOWED MODIFICATIONS (based on user request):
- Clothing and styling changes
- Background and environment changes
- Lighting and photography style adjustments
- Pose and expression modifications
- Hair styling and color changes (if requested)
- Makeup and grooming enhancements
- Artistic style applications
- Color grading and mood adjustments

❌ FORBIDDEN CHANGES:
- Core facial features and bone structure
- Basic facial proportions and geometry
- Individual identifying characteristics
- Changes that would make the person unrecognizable
- Inappropriate or harmful content

TECHNICAL REQUIREMENTS:
- High quality, professional image generation
- Appropriate lighting for the desired style
- Sharp focus and clear details
- Balanced composition and framing
- Natural and realistic appearance (unless artistic style requested)
- Consistent with the user's specific requirements

QUALITY STANDARDS:
- Professional photography or art quality
- Attention to detail in all elements
- Harmonious color palette
- Proper depth of field and focus
- Clean and polished final result

FINAL RESULT GOALS:
- Fulfill the user's specific request accurately
- Maintain the person's identity and recognizability
- Achieve professional quality in execution
- Balance creativity with realism (unless otherwise specified)
- Create a result that meets or exceeds user expectations

CRITICAL: The generated image must satisfy the user's request while preserving the person's identity. Focus on achieving the specific effect or style the user wants while keeping the person recognizable."""

            # 调用AI生成定制图像
            logger.info("🤖 正在生成用户定制图像...")
            
            contents = [
                f"CUSTOM GENERATION TASK: Transform this person according to the user's request: '{user_prompt}'",
                portrait_image,
                synthesis_prompt,
                f"Remember: Fulfill the user's specific request '{user_prompt}' while maintaining the person's identity and creating a high-quality result."
            ]
            
            response = model.generate_content(contents)
            
            # 处理响应
            response_dict = response.to_dict()
            logger.info(f"📋 API响应结构: {list(response_dict.keys())}")
            
            if "candidates" in response_dict and len(response_dict["candidates"]) > 0:
                parts = response_dict["candidates"][0]["content"]["parts"]
                
                # 检查文本响应
                for part in parts:
                    if "text" in part and part["text"]:
                        logger.info("🤖 AI响应:")
                        logger.info(part["text"])
                
                # 提取生成的图片
                for part in parts:
                    if "inline_data" in part:
                        try:
                            raw_data = part["inline_data"]["data"]
                            
                            if isinstance(raw_data, str):
                                logger.info("📦 解码定制图像数据...")
                                image_data = base64.b64decode(raw_data)
                            elif isinstance(raw_data, bytes):
                                logger.info("📦 处理字节格式数据...")
                                image_data = raw_data
                            else:
                                logger.error(f"❌ 未知数据类型: {type(raw_data)}")
                                continue
                            
                            # 创建定制图像
                            image_buffer = BytesIO(image_data)
                            image_buffer.seek(0)
                            custom_image = Image.open(image_buffer)
                            
                            logger.info(f"✅ 定制图像生成成功: {custom_image.size}")
                            
                            # 保存定制图像
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"custom_generated_{timestamp}.png"
                            filepath = os.path.join(self.output_dir, filename)
                            
                            custom_image.save(filepath)
                            logger.info(f"✅ 定制图像已保存: {filepath}")
                            
                            file_size = os.path.getsize(filepath)
                            logger.info(f"📊 文件大小: {file_size / 1024:.1f} KB")
                            logger.info(f"📐 图像尺寸: {custom_image.size}")
                            
                            return filepath
                            
                        except Exception as e:
                            logger.error(f"❌ 图像提取失败: {e}")
                            continue
            
            logger.error("❌ 未找到生成的定制图像")
            return None
            
        except Exception as e:
            logger.error(f"❌ 定制图像生成失败: {e}")
            raise
    
    def generate_custom_image_with_prompt(self, portrait_path: str, user_prompt: str) -> dict:
        """完整的两阶段自定义提示词图像生成流程"""
        logger.info("🚀 开始两阶段自定义提示词图像生成...")
        logger.info(f"👤 输入照片: {portrait_path}")
        logger.info(f"💭 用户需求: {user_prompt}")
        
        start_time = datetime.now()
        
        try:
            # 第一阶段：结合用户需求分析
            logger.info("\n" + "="*50)
            logger.info("第一阶段：结合用户需求分析照片，生成专业提示词")
            professional_prompt = self.stage1_analyze_with_user_prompt(portrait_path, user_prompt)
            
            # 第二阶段：定制化图像生成
            logger.info("\n" + "="*50)
            logger.info("第二阶段：基于专业提示词生成定制图像")
            custom_image_path = self.stage2_generate_custom_image(
                portrait_path, 
                professional_prompt,
                user_prompt
            )
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            if custom_image_path:
                result = {
                    "success": True,
                    "message": "自定义提示词图像生成成功完成",
                    "custom_image": custom_image_path,
                    "user_prompt": user_prompt,
                    "professional_prompt": professional_prompt,
                    "processing_time": processing_time,
                    "timestamp": end_time.isoformat()
                }
                logger.info(f"🎉 自定义图像生成成功，用时: {processing_time:.2f} 秒")
            else:
                result = {
                    "success": False,
                    "message": "定制图像生成失败",
                    "user_prompt": user_prompt,
                    "professional_prompt": professional_prompt,
                    "processing_time": processing_time,
                    "timestamp": end_time.isoformat()
                }
                logger.error("❌ 定制图像生成失败")
            
            return result
            
        except Exception as e:
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            result = {
                "success": False,
                "message": f"自定义图像生成失败: {str(e)}",
                "error": str(e),
                "user_prompt": user_prompt,
                "processing_time": processing_time,
                "timestamp": end_time.isoformat()
            }
            logger.error(f"❌ 自定义图像生成失败: {e}")
            return result

def main():
    """主函数：演示自定义提示词图像生成功能"""
    print("🧪 两阶段AI自定义提示词图像生成测试")
    print("=" * 60)
    print("第一阶段：结合用户需求分析照片，生成专业提示词")
    print("第二阶段：基于专业提示词生成用户定制图像")
    print("=" * 60)
    
    # 初始化自定义生成器
    generator = CustomPromptImageGenerator()
    
    # 设置输入照片路径
    portrait_photo = "/app/thy_test/17.better_image_generation/person_me_2.png"
    
    # 检查输入文件
    if not os.path.exists(portrait_photo):
        print(f"❌ 输入照片不存在: {portrait_photo}")
        print("请将您的人像照片放置在指定路径，或修改脚本中的路径")
        return
    
    # 示例用户提示词（可以修改为任何需求）
    user_prompts = [
        "让我看起来像一个专业的医生，穿白大褂，在医院环境中",
        "把我变成一个时尚的模特，穿着潮流服装，在时尚摄影棚里",
        "让我看起来像一个古代的武士，穿着传统盔甲，在古代战场上",
        "把我变成一个科幻电影中的宇航员，穿着太空服，在太空站里",
        "让我看起来更年轻，皮肤更好，在阳光明媚的海边"
    ]
    
    # 让用户选择或输入自定义提示词
    print("\n📝 请选择一个示例提示词或输入自定义需求:")
    for i, prompt in enumerate(user_prompts, 1):
        print(f"{i}. {prompt}")
    print("6. 输入自定义提示词")
    
    try:
        choice = input("\n请输入选择 (1-6): ").strip()
        
        if choice in ['1', '2', '3', '4', '5']:
            user_prompt = user_prompts[int(choice) - 1]
        elif choice == '6':
            user_prompt = input("请输入您的自定义提示词: ").strip()
            if not user_prompt:
                print("❌ 提示词不能为空，使用默认提示词")
                user_prompt = user_prompts[0]
        else:
            print("❌ 无效选择，使用默认提示词")
            user_prompt = user_prompts[0]
            
    except (KeyboardInterrupt, EOFError):
        print("\n使用默认提示词进行演示")
        user_prompt = user_prompts[0]
    
    print(f"\n🎯 使用的提示词: {user_prompt}")
    
    # 执行自定义图像生成
    result = generator.generate_custom_image_with_prompt(portrait_photo, user_prompt)
    
    # 显示结果
    print("\n" + "=" * 60)
    print("📊 处理结果:")
    
    if result["success"]:
        print(f"✅ {result['message']}")
        print(f"🖼️ 定制图像: {result['custom_image']}")
        print(f"💭 用户需求: {result['user_prompt']}")
        print(f"⏱️ 处理时间: {result['processing_time']:.2f} 秒")
        print("\n💡 自定义功能特点:")
        print("   - 支持任意用户提示词和需求")
        print("   - 智能分析用户意图并生成专业提示词")
        print("   - 保持人物身份的同时实现用户需求")
        print("   - 适应各种风格和场景要求")
        print("   - 平衡创意实现和真实性")
    else:
        print(f"❌ {result['message']}")
        if "error" in result:
            print(f"🔍 错误详情: {result['error']}")
        print(f"💭 用户需求: {result['user_prompt']}")
        print(f"⏱️ 处理时间: {result['processing_time']:.2f} 秒")
        
        print("\n💡 故障排除建议:")
        print("   - 确保输入照片清晰，人物面部清楚可见")
        print("   - 检查网络连接和API配额状态")
        print("   - 尝试使用更具体和清晰的提示词")
        print("   - 避免使用可能不合适的内容描述")
        print("   - 确保提示词描述合理且可实现")

if __name__ == "__main__":
    main() 
def main_cli():
    """命令行接口"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='AI自定义图片生成')
    parser.add_argument('--image', required=True, help='输入图片路径')
    parser.add_argument('--prompt', required=True, help='用户提示词')
    parser.add_argument('--output-dir', default='./output', help='输出目录')
    
    args = parser.parse_args()
    
    try:
        print(f"🎯 命令行模式启动")
        print(f"📷 输入图片: {args.image}")
        print(f"💭 用户提示词: {args.prompt}")
        print(f"📁 输出目录: {args.output_dir}")
        
        # 检查输入文件
        if not os.path.exists(args.image):
            error_result = {
                'success': False,
                'message': f'输入图片不存在: {args.image}',
                'error': 'FileNotFound'
            }
            print(json.dumps(error_result, ensure_ascii=False))
            sys.exit(1)
        
        # 设置输出目录
        generator = CustomPromptImageGenerator()
        generator.output_dir = args.output_dir
        os.makedirs(generator.output_dir, exist_ok=True)
        
        print(f"🚀 开始执行自定义图片生成...")
        
        # 执行生成
        result = generator.generate_custom_image_with_prompt(args.image, args.prompt)
        
        # 输出JSON结果供Node.js解析
        print("=" * 50)
        print("JSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False))
        print("JSON_RESULT_END")
        print("=" * 50)
        
        if result['success']:
            print(f"✅ 生成成功！结果保存在: {result.get('custom_image', 'N/A')}")
            sys.exit(0)
        else:
            print(f"❌ 生成失败: {result.get('message', '未知错误')}")
            sys.exit(1)
            
    except Exception as e:
        error_result = {
            'success': False,
            'message': f'生成失败: {str(e)}',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print("=" * 50)
        print("JSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False))
        print("JSON_RESULT_END")
        print("=" * 50)
        print(f"❌ 异常: {e}")
        sys.exit(1)

# 修改主函数入口
if __name__ == "__main__":
    import sys
    # 检查是否有命令行参数
    if len(sys.argv) > 1 and '--image' in sys.argv:
        main_cli()
    else:
        main()
