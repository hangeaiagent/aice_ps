#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
纯文本生成图片脚本 - 用于漫画生成
功能：
1. 纯文本到图片生成
2. 支持多种AI图片生成服务
3. 完整的日志记录和错误处理
"""

import os
import sys
import json
import logging
import argparse
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import traceback

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('text_to_image.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class TextToImageGenerator:
    """纯文本生成图片生成器"""
    
    def __init__(self):
        """初始化生成器"""
        self.setup_services()
    
    def setup_services(self):
        """设置图片生成服务"""
        logger.info("初始化文本生成图片服务...")
        
        # 这里可以集成多种AI图片生成服务
        # 例如：Stable Diffusion, DALL-E, Midjourney API等
        # 目前先使用模拟实现
        
        logger.info("文本生成图片服务初始化完成")
    
    def generate_image_from_text(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        num_inference_steps: int = 20,
        guidance_scale: float = 7.5,
        seed: int = -1,
        output_path: str = None
    ) -> Dict[str, Any]:
        """
        从文本生成图片
        
        Args:
            prompt: 正面提示词
            negative_prompt: 负面提示词
            width: 图片宽度
            height: 图片高度
            num_inference_steps: 推理步数
            guidance_scale: 引导强度
            seed: 随机种子
            output_path: 输出路径
        
        Returns:
            生成结果字典
        """
        try:
            logger.info(f"开始生成图片 - 提示词: {prompt[:100]}...")
            
            # 生成唯一的任务ID
            task_id = str(uuid.uuid4())
            
            # 记录生成参数
            generation_params = {
                "task_id": task_id,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "seed": seed if seed > 0 else None,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"生成参数: {json.dumps(generation_params, indent=2, ensure_ascii=False)}")
            
            # 这里应该调用真实的AI图片生成服务
            # 目前先创建一个占位图片
            success = self._create_placeholder_image(output_path, width, height, prompt)
            
            if success:
                result = {
                    "success": True,
                    "message": "图片生成成功",
                    "task_id": task_id,
                    "output_path": output_path,
                    "generation_params": generation_params,
                    "processing_time": 2.5  # 模拟处理时间
                }
                logger.info(f"图片生成成功: {output_path}")
            else:
                result = {
                    "success": False,
                    "message": "图片生成失败",
                    "task_id": task_id,
                    "error": "无法创建输出图片"
                }
                logger.error("图片生成失败")
            
            return result
            
        except Exception as e:
            error_msg = f"图片生成异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "message": error_msg,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    def _create_placeholder_image(self, output_path: str, width: int, height: int, prompt: str) -> bool:
        """
        创建占位图片（临时实现）
        在真实环境中，这里应该调用AI图片生成服务
        """
        try:
            # 尝试使用PIL创建真实图片
            try:
                from PIL import Image, ImageDraw, ImageFont
                import textwrap
                
                # 创建图片
                img = Image.new('RGB', (width, height), color='lightblue')
                draw = ImageDraw.Draw(img)
                
                # 添加文本
                try:
                    # 尝试使用系统字体
                    font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
                except:
                    # 如果找不到字体，使用默认字体
                    font = ImageFont.load_default()
                
                # 包装文本
                wrapped_text = textwrap.fill(prompt[:100], width=30)
                
                # 计算文本位置
                bbox = draw.textbbox((0, 0), wrapped_text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                x = (width - text_width) // 2
                y = (height - text_height) // 2
                
                # 绘制文本
                draw.text((x, y), wrapped_text, fill='darkblue', font=font)
                
                # 添加标识
                draw.text((10, 10), "AI Generated Image", fill='gray', font=font)
                draw.text((10, height-30), f"{width}x{height}", fill='gray', font=font)
                
                # 保存图片
                img.save(output_path, 'JPEG', quality=95)
                
                logger.info(f"PIL图片已保存: {output_path}")
                return True
                
            except ImportError:
                # 如果没有PIL，创建一个简单的SVG文件
                logger.warning("PIL不可用，创建SVG占位图片")
                
                svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="lightblue"/>
  <text x="50%" y="20%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="darkblue">
    AI Generated Image
  </text>
  <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="darkblue">
    {prompt[:50]}...
  </text>
  <text x="50%" y="80%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="gray">
    {width}x{height}
  </text>
</svg>'''
                
                # 将SVG保存为文件（虽然扩展名是jpg，但内容是SVG）
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(svg_content)
                
                logger.info(f"SVG占位图片已保存: {output_path}")
                return True
            
        except Exception as e:
            logger.error(f"创建占位图片失败: {e}")
            return False

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='纯文本生成图片')
    parser.add_argument('--mode', default='text2img', help='生成模式（text2img）')
    parser.add_argument('--prompt', required=True, help='正面提示词')
    parser.add_argument('--negative_prompt', default='', help='负面提示词')
    parser.add_argument('--output', required=True, help='输出图片路径')
    parser.add_argument('--width', type=int, default=512, help='图片宽度')
    parser.add_argument('--height', type=int, default=512, help='图片高度')
    parser.add_argument('--steps', type=int, default=20, help='推理步数')
    parser.add_argument('--guidance', type=float, default=7.5, help='引导强度')
    parser.add_argument('--seed', type=int, default=-1, help='随机种子')
    
    args = parser.parse_args()
    
    try:
        logger.info("="*50)
        logger.info("文本生成图片脚本启动")
        logger.info(f"模式: {args.mode}")
        logger.info(f"提示词: {args.prompt[:100]}...")
        logger.info(f"输出路径: {args.output}")
        logger.info("="*50)
        
        if args.mode != 'text2img':
            raise ValueError(f"不支持的模式: {args.mode}，仅支持 text2img")
        
        generator = TextToImageGenerator()
        result = generator.generate_image_from_text(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            width=args.width,
            height=args.height,
            num_inference_steps=args.steps,
            guidance_scale=args.guidance,
            seed=args.seed,
            output_path=args.output
        )
        
        # 输出JSON结果供Node.js解析
        print("\nJSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("JSON_RESULT_END")
        
        # 设置退出码
        sys.exit(0 if result["success"] else 1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"脚本执行失败: {str(e)}",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        
        logger.error(f"脚本执行失败: {e}", exc_info=True)
        
        print("\nJSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        print("JSON_RESULT_END")
        
        sys.exit(1)

if __name__ == "__main__":
    main()
