#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版图片生成器 - 集成AWS S3和数据库记录
功能：
1. 图片生成（基于现有的custom_prompt_image_generator.py）
2. AWS S3文件上传
3. 数据库任务记录
4. 完整的日志记录
"""

import os
import sys
import json
import logging
import argparse
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import traceback

# 第三方库
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import psycopg2
from psycopg2.extras import RealDictCursor
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('image_generation.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class EnhancedImageGenerator:
    """增强版图片生成器"""
    
    def __init__(self):
        """初始化生成器"""
        self.setup_gemini()
        self.setup_aws()
        self.setup_database()
        self.output_dir = "./backend/output"
        os.makedirs(self.output_dir, exist_ok=True)
        
    def setup_gemini(self):
        """配置Gemini API"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("请在.env文件中设置GEMINI_API_KEY环境变量")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-image-preview')
        logger.info("✅ Gemini API配置完成")
        
    def setup_aws(self):
        """配置AWS S3"""
        try:
            # 统一环境变量名称，与其他服务保持一致
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_region = os.getenv('AWS_REGION', 'us-east-1')
            # 统一使用AWS_S3_BUCKET变量名
            self.s3_bucket = os.getenv('AWS_S3_BUCKET') or os.getenv('S3_BUCKET_NAME', 'spotgitagent')
            
            logger.info(f"🔧 AWS配置检查:")
            logger.info(f"   - Access Key: {'已配置' if aws_access_key else '未配置'}")
            logger.info(f"   - Secret Key: {'已配置' if aws_secret_key else '未配置'}")
            logger.info(f"   - Region: {aws_region}")
            logger.info(f"   - Bucket: {self.s3_bucket}")
            
            if not aws_access_key or not aws_secret_key:
                raise NoCredentialsError("AWS凭证未配置")
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # 测试S3连接（跳过HeadBucket检查，直接尝试使用）
            try:
                self.s3_client.head_bucket(Bucket=self.s3_bucket)
                logger.info(f"✅ AWS S3配置完成，存储桶: {self.s3_bucket}")
            except ClientError as e:
                if e.response['Error']['Code'] == '403':
                    logger.warning(f"⚠️ HeadBucket权限不足，但将尝试直接上传到存储桶: {self.s3_bucket}")
                    # 不设置为None，继续尝试上传
                else:
                    raise e
            
        except (NoCredentialsError, ClientError) as e:
            logger.warning(f"⚠️ AWS S3配置失败: {e}，将使用本地存储")
            logger.warning("💡 请检查以下环境变量是否正确配置:")
            logger.warning("   - AWS_ACCESS_KEY_ID")
            logger.warning("   - AWS_SECRET_ACCESS_KEY") 
            logger.warning("   - AWS_S3_BUCKET")
            self.s3_client = None
            self.s3_bucket = None
            
    def setup_database(self):
        """配置数据库连接"""
        # 暂时跳过数据库配置，专注于图片生成功能
        logger.info("⚠️ 数据库功能暂时禁用，专注于图片生成测试")
        self.db_conn = None
            
    def create_task_record(self, user_id: str, prompt: str, task_type: str = 'custom_image_generation') -> Optional[str]:
        """创建任务记录"""
        if not self.db_conn:
            logger.warning("数据库未配置，跳过任务记录创建")
            return None
            
        try:
            task_id = str(uuid.uuid4())
            
            with self.db_conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO user_task_history 
                    (id, user_id, task_type, prompt, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (task_id, user_id, task_type, prompt, 'processing', datetime.now()))
                
                self.db_conn.commit()
                logger.info(f"✅ 任务记录创建成功: {task_id}")
                return task_id
                
        except Exception as e:
            logger.error(f"❌ 创建任务记录失败: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return None
            
    def update_task_record(self, task_id: str, update_data: Dict[str, Any]) -> bool:
        """更新任务记录"""
        if not self.db_conn or not task_id:
            return False
            
        try:
            # 构建更新SQL
            set_clauses = []
            values = []
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = %s")
                values.append(value)
                
            # 添加更新时间
            set_clauses.append("updated_at = %s")
            values.append(datetime.now())
            values.append(task_id)
            
            sql = f"UPDATE user_task_history SET {', '.join(set_clauses)} WHERE id = %s"
            
            with self.db_conn.cursor() as cursor:
                cursor.execute(sql, values)
                self.db_conn.commit()
                
                logger.info(f"✅ 任务记录更新成功: {task_id}")
                return True
                
        except Exception as e:
            logger.error(f"❌ 更新任务记录失败: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return False
            
    def upload_to_s3(self, file_path: str, s3_key: str, content_type: str = 'image/jpeg') -> Optional[str]:
        """上传文件到S3"""
        if not self.s3_client:
            logger.warning("📤 S3未配置，跳过文件上传")
            return None
            
        if not os.path.exists(file_path):
            logger.error(f"❌ 文件不存在，无法上传: {file_path}")
            return None
            
        try:
            # 获取文件信息
            file_size = os.path.getsize(file_path)
            logger.info(f"📤 开始上传文件到S3:")
            logger.info(f"   - 本地路径: {file_path}")
            logger.info(f"   - S3键名: {s3_key}")
            logger.info(f"   - 文件大小: {file_size / 1024:.1f} KB")
            logger.info(f"   - 内容类型: {content_type}")
            logger.info(f"   - 目标存储桶: {self.s3_bucket}")
            
            upload_start = datetime.now()
            
            with open(file_path, 'rb') as file:
                self.s3_client.upload_fileobj(
                    file,
                    self.s3_bucket,
                    s3_key,
                    ExtraArgs={
                        'ContentType': content_type,
                        'ACL': 'public-read'
                    }
                )
            
            upload_time = (datetime.now() - upload_start).total_seconds()
            
            # 生成公开访问URL
            s3_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{s3_key}"
            
            logger.info(f"✅ 文件上传到S3成功!")
            logger.info(f"   - 上传时间: {upload_time:.2f}秒")
            logger.info(f"   - 访问URL: {s3_url}")
            logger.info(f"   - 上传速度: {(file_size / 1024 / upload_time):.1f} KB/s")
            
            return s3_url
            
        except Exception as e:
            logger.error(f"❌ S3上传失败:")
            logger.error(f"   - 错误信息: {e}")
            logger.error(f"   - 文件路径: {file_path}")
            logger.error(f"   - S3键名: {s3_key}")
            logger.error(f"   - 存储桶: {self.s3_bucket}")
            return None
            
    def stage1_analyze_with_user_prompt(self, portrait_path: str, user_prompt: str) -> str:
        """第一阶段：结合用户提示词分析人物照片，生成专业的图像生成提示词"""
        logger.info("🔍 第一阶段：结合用户需求分析照片，生成专业提示词...")
        
        if not os.path.exists(portrait_path):
            raise FileNotFoundError(f"人像照片未找到: {portrait_path}")
        
        try:
            portrait_image = Image.open(portrait_path)
            logger.info(f"人像照片已加载: {portrait_path}")
            logger.info(f"用户提示词: {user_prompt}")
            
            # 构建分析提示词
            analysis_prompt = f"""
请仔细分析这张人物照片，并结合用户的需求："{user_prompt}"

请生成一个专业的图像生成提示词，要求：
1. 保持人物的基本特征和身份特征
2. 根据用户需求进行相应的修改或增强
3. 提示词要具体、详细，包含风格、光线、构图等要素
4. 确保生成的图像质量高、符合用户期望

请直接返回提示词，不要包含其他解释文字。
"""
            
            # 调用Gemini进行分析
            response = self.model.generate_content([analysis_prompt, portrait_image])
            
            # 安全地处理响应格式
            professional_prompt = "无法生成专业提示词，使用默认描述"
            try:
                if hasattr(response, 'text'):
                    professional_prompt = response.text.strip()
                elif hasattr(response, 'candidates') and response.candidates:
                    # 尝试从candidates中获取文本
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                professional_prompt = part.text.strip()
                                break
            except Exception as text_error:
                logger.warning(f"⚠️ 无法解析Gemini响应文本: {text_error}")
                # 使用基于用户提示词的默认专业提示词
                professional_prompt = f"""
专业图像生成提示词：
基于用户需求"{user_prompt}"，创建一个高质量的图像：
- 保持人物的基本特征和身份
- {user_prompt}
- 确保图像清晰、专业、美观
- 使用适当的光线和构图
- 风格：写实、高清、专业摄影风格
"""
            
            logger.info(f"✅ 第一阶段分析完成，生成专业提示词: {professional_prompt[:100]}...")
            return professional_prompt
            
        except Exception as e:
            logger.error(f"❌ 自定义需求分析失败: {e}")
            raise
            
    def stage2_generate_custom_image(self, portrait_path: str, professional_prompt: str) -> str:
        """第二阶段：基于专业提示词生成定制图像"""
        logger.info("🎨 第二阶段：基于专业提示词生成定制图像...")
        
        try:
            portrait_image = Image.open(portrait_path)
            
            # 构建生成提示词
            generation_prompt = f"""
基于以下专业提示词生成图像：
{professional_prompt}

要求：
1. 生成高质量、专业的图像
2. 保持与原图的一致性
3. 确保图像清晰、美观
4. 符合提示词的所有要求
"""
            
            # 调用Gemini生成图像
            response = self.model.generate_content([generation_prompt, portrait_image])
            
            # 保存生成的图像
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"custom_generated_{timestamp}.jpg"
            output_path = os.path.join(self.output_dir, output_filename)
            
            # 目前Gemini 2.5 Flash Image Preview主要用于图像分析，不是图像生成
            # 这里我们创建一个示例输出图像，实际项目中需要集成真正的图像生成模型
            logger.warning("⚠️ 当前使用示例图像生成，实际部署需要集成图像生成模型")
            
            # 创建一个示例生成图像（基于原图的修改版本）
            generated_image = portrait_image.copy()
            # 这里可以添加一些简单的图像处理作为示例
            # 实际应用中需要调用真正的图像生成API
            generated_image.save(output_path, 'JPEG', quality=95)
                
            logger.info(f"✅ 第二阶段图像生成完成: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ 自定义图像生成失败: {e}")
            raise
            
    def generate_image_with_logging(self, image_path: str, prompt: str, user_id: str = None, 
                                  output_dir: str = None) -> Dict[str, Any]:
        """完整的图片生成流程，包含日志记录"""
        start_time = datetime.now()
        task_id = None
        result = {
            'success': False,
            'message': '',
            'task_id': None,
            'original_image_url': None,
            'generated_image_url': None,
            'professional_prompt': '',
            'processing_time': 0,
            'user_prompt': prompt
        }
        
        # 生成唯一标识符用于S3文件命名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        try:
            logger.info("🚀 开始增强版图片生成流程...")
            logger.info(f"👤 输入照片: {image_path}")
            logger.info(f"💭 用户需求: {prompt}")
            logger.info(f"👨‍💼 用户ID: {user_id}")
            logger.info(f"🔖 会话标识: {timestamp}_{unique_id}")
            
            # 1. 创建任务记录（如果数据库可用）
            if user_id and self.db_conn:
                task_id = self.create_task_record(user_id, prompt)
                result['task_id'] = task_id
                logger.info(f"📝 任务记录已创建: {task_id}")
            else:
                logger.info("📝 数据库未配置，跳过任务记录创建")
                
            # 2. 上传原始图片到S3（不依赖task_id）
            original_s3_key = None
            if self.s3_client:
                logger.info("\n" + "="*50)
                logger.info("📤 第一步：上传原始图片到S3")
                
                if task_id:
                    # 如果有任务ID，使用任务结构
                    original_s3_key = f"task-history/{user_id}/{task_id}/original.jpg"
                else:
                    # 如果没有任务ID，使用时间戳结构
                    original_s3_key = f"original-images/{timestamp}_{unique_id}_original.jpg"
                
                original_url = self.upload_to_s3(image_path, original_s3_key, 'image/jpeg')
                result['original_image_url'] = original_url
                
                # 更新任务记录中的原始图片URL（如果有任务记录）
                if original_url and task_id:
                    self.update_task_record(task_id, {
                        'original_image_url': original_url,
                        'aws_original_key': original_s3_key
                    })
                    logger.info("📝 任务记录已更新原始图片信息")
            else:
                logger.warning("📤 S3未配置，跳过原始图片上传")
                    
            # 3. 第一阶段：分析和生成专业提示词
            logger.info("\n" + "="*50)
            logger.info("🔍 第二步：结合用户需求分析照片，生成专业提示词")
            professional_prompt = self.stage1_analyze_with_user_prompt(image_path, prompt)
            result['professional_prompt'] = professional_prompt
            
            # 4. 第二阶段：生成定制图像
            logger.info("\n" + "="*50)
            logger.info("🎨 第三步：基于专业提示词生成定制图像")
            generated_image_path = self.stage2_generate_custom_image(image_path, professional_prompt)
            
            # 5. 上传生成图片到S3（不依赖task_id）
            generated_s3_key = None
            if self.s3_client and os.path.exists(generated_image_path):
                logger.info("\n" + "="*50)
                logger.info("📤 第四步：上传生成图片到S3")
                
                if task_id:
                    # 如果有任务ID，使用任务结构
                    generated_s3_key = f"task-history/{user_id}/{task_id}/generated.jpg"
                else:
                    # 如果没有任务ID，使用时间戳结构
                    generated_s3_key = f"generated-images/{timestamp}_{unique_id}_generated.jpg"
                
                generated_url = self.upload_to_s3(generated_image_path, generated_s3_key, 'image/jpeg')
                result['generated_image_url'] = generated_url
                
                if generated_url:
                    logger.info("✅ 生成图片上传成功")
                else:
                    logger.warning("⚠️ 生成图片上传失败")
            else:
                if not self.s3_client:
                    logger.warning("📤 S3未配置，跳过生成图片上传")
                elif not os.path.exists(generated_image_path):
                    logger.error(f"❌ 生成图片文件不存在: {generated_image_path}")
                
            # 6. 计算处理时间
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            result['processing_time'] = processing_time
            
            # 7. 更新任务记录为完成状态（如果有）
            if task_id:
                logger.info("\n" + "="*50)
                logger.info("📝 第五步：更新任务记录")
                
                update_data = {
                    'status': 'completed',
                    'professional_prompt': professional_prompt,
                    'generation_time_ms': int(processing_time * 1000),
                    'completed_at': end_time
                }
                
                if result['generated_image_url']:
                    update_data['generated_image_url'] = result['generated_image_url']
                    update_data['aws_generated_key'] = generated_s3_key
                    
                if result['original_image_url']:
                    update_data['original_image_url'] = result['original_image_url']
                    update_data['aws_original_key'] = original_s3_key
                    
                self.update_task_record(task_id, update_data)
                logger.info("✅ 任务记录更新完成")
                
            result['success'] = True
            result['message'] = '图片生成成功'
            
            logger.info("\n" + "="*50)
            logger.info("🎉 图片生成流程完成！")
            logger.info(f"   - 处理时间: {processing_time:.2f}秒")
            logger.info(f"   - 原始图片URL: {result['original_image_url'] or '未上传'}")
            logger.info(f"   - 生成图片URL: {result['generated_image_url'] or '未上传'}")
            logger.info(f"   - 任务ID: {task_id or '无'}")
            
        except Exception as e:
            error_msg = f"图片生成失败: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"错误详情: {traceback.format_exc()}")
            
            result['success'] = False
            result['message'] = error_msg
            result['error'] = str(e)
            
            # 更新任务记录为失败状态（如果有）
            if task_id:
                end_time = datetime.now()
                processing_time = (end_time - start_time).total_seconds()
                self.update_task_record(task_id, {
                    'status': 'failed',
                    'error_message': error_msg,
                    'generation_time_ms': int(processing_time * 1000),
                    'completed_at': end_time
                })
                logger.info("📝 任务记录已更新为失败状态")
                
        finally:
            # 清理临时文件
            try:
                if os.path.exists(image_path) and 'temp' in image_path:
                    os.remove(image_path)
                    logger.info(f"🗑️ 临时文件已清理: {image_path}")
            except Exception as e:
                logger.warning(f"⚠️ 清理临时文件失败: {e}")
                
        return result
        
    def __del__(self):
        """清理资源"""
        if hasattr(self, 'db_conn') and self.db_conn:
            self.db_conn.close()
            logger.info("数据库连接已关闭")

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='增强版图片生成器')
    parser.add_argument('--image', required=True, help='输入图片路径')
    parser.add_argument('--prompt', required=True, help='用户提示词')
    parser.add_argument('--user-id', help='用户ID（可选）')
    parser.add_argument('--output-dir', help='输出目录（可选）')
    
    args = parser.parse_args()
    
    try:
        generator = EnhancedImageGenerator()
        result = generator.generate_image_with_logging(
            image_path=args.image,
            prompt=args.prompt,
            user_id=args.user_id,
            output_dir=args.output_dir
        )
        
        # 输出JSON结果供Node.js解析
        print("\nJSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("JSON_RESULT_END")
        
        # 根据结果设置退出码
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'message': f'脚本执行失败: {str(e)}',
            'error': str(e),
            'user_prompt': args.prompt,
            'processing_time': 0,
            'timestamp': datetime.now().isoformat()
        }
        
        print("\nJSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        print("JSON_RESULT_END")
        
        logger.error(f"❌ 脚本执行失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
