/**
 * OCR文字识别服务
 * 支持从图片中提取文字内容
 */

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

export interface OCRConfig {
  apiKey?: string;
  language?: string;
  detectOrientation?: boolean;
  outputFormat?: 'text' | 'structured';
}

class OCRService {
  private config: OCRConfig;

  constructor(config: OCRConfig = {}) {
    this.config = {
      language: 'zh-Hans+en', // 中文和英文
      detectOrientation: true,
      outputFormat: 'text',
      ...config
    };
  }

  /**
   * 从图片文件识别文字
   */
  async recognizeText(imageFile: File): Promise<OCRResult> {
    try {
      // 首先尝试使用浏览器的OCR API（如果可用）
      if ('ml' in window && 'createTextDetector' in (window as any).ml) {
        return await this.useBrowserOCR(imageFile);
      }

      // 使用第三方OCR服务
      if (this.config.apiKey) {
        return await this.useCloudOCR(imageFile);
      }

      // 使用Tesseract.js作为fallback
      return await this.useTesseractOCR(imageFile);

    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error(`文字识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用浏览器内置OCR API
   */
  private async useBrowserOCR(imageFile: File): Promise<OCRResult> {
    try {
      const textDetector = await (window as any).ml.createTextDetector();
      const bitmap = await createImageBitmap(imageFile);
      const detections = await textDetector.detect(bitmap);
      
      let fullText = '';
      const boundingBoxes: OCRResult['boundingBoxes'] = [];

      for (const detection of detections) {
        fullText += detection.rawValue + '\n';
        boundingBoxes?.push({
          text: detection.rawValue,
          x: detection.boundingBox.x,
          y: detection.boundingBox.y,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
          confidence: detection.confidence || 0.8
        });
      }

      return {
        text: fullText.trim(),
        confidence: 0.8,
        language: 'auto',
        boundingBoxes
      };
    } catch (error) {
      throw new Error('浏览器OCR不可用');
    }
  }

  /**
   * 使用云端OCR服务
   */
  private async useCloudOCR(imageFile: File): Promise<OCRResult> {
    // 这里可以集成Google Cloud Vision、Azure Computer Vision等
    // 暂时使用模拟实现
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('language', this.config.language || 'zh-Hans+en');

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OCR服务错误: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        confidence: result.confidence || 0.8,
        language: result.language || 'auto',
        boundingBoxes: result.boundingBoxes
      };
    } catch (error) {
      throw new Error(`云端OCR服务失败: ${error instanceof Error ? error.message : '网络错误'}`);
    }
  }

  /**
   * 使用Tesseract.js进行OCR识别
   */
  private async useTesseractOCR(imageFile: File): Promise<OCRResult> {
    // 动态导入Tesseract.js以减少初始包大小
    const Tesseract = await this.loadTesseract();
    
    try {
      const { data } = await Tesseract.recognize(imageFile, this.config.language || 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            // 可以在这里更新进度
            console.log(`OCR进度: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      return {
        text: data.text.trim(),
        confidence: data.confidence / 100,
        language: this.config.language || 'auto',
        boundingBoxes: data.words?.map(word => ({
          text: word.text,
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
          confidence: word.confidence / 100
        }))
      };
    } catch (error) {
      throw new Error(`Tesseract OCR失败: ${error instanceof Error ? error.message : '识别错误'}`);
    }
  }

  /**
   * 动态加载Tesseract.js
   */
  private async loadTesseract(): Promise<any> {
    try {
      // 使用动态导入
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker();
      await worker.loadLanguage(this.config.language || 'chi_sim+eng');
      await worker.initialize(this.config.language || 'chi_sim+eng');
      
      return {
        recognize: async (image: File, lang: string, options?: any) => {
          const result = await worker.recognize(image, options);
          await worker.terminate();
          return result;
        }
      };
    } catch (error) {
      // 如果无法加载Tesseract.js，使用简单的fallback
      return this.createFallbackOCR();
    }
  }

  /**
   * 创建fallback OCR（简单的模拟实现）
   */
  private createFallbackOCR() {
    return {
      recognize: async (imageFile: File): Promise<{ data: any }> => {
        // 这里可以实现一个简单的OCR fallback
        // 或者返回提示用户手动输入的结果
        
        return {
          data: {
            text: '图片文字识别功能暂时不可用，请手动输入文字内容。\n\n提示：您可以：\n1. 手动输入图片中的文字\n2. 使用其他OCR工具识别后粘贴\n3. 稍后再试',
            confidence: 0.1,
            words: []
          }
        };
      }
    };
  }

  /**
   * 预处理图片以提高OCR准确率
   */
  async preprocessImage(imageFile: File): Promise<File> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建画布上下文');
      }

      // 加载图片
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageFile);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // 设置画布尺寸
      canvas.width = img.width;
      canvas.height = img.height;

      // 绘制图片
      ctx.drawImage(img, 0, 0);

      // 应用图像处理以提高OCR准确率
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 转换为灰度并增强对比度
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const enhanced = gray > 128 ? 255 : 0; // 二值化
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
        // data[i + 3] 保持不变 (Alpha)
      }

      ctx.putImageData(imageData, 0, 0);

      // 转换回文件
      const processedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve as BlobCallback, 'image/png');
      });

      // 清理
      URL.revokeObjectURL(imageUrl);

      return new File([processedBlob!], 'processed_' + imageFile.name, {
        type: 'image/png'
      });

    } catch (error) {
      console.warn('图片预处理失败，使用原始图片:', error);
      return imageFile;
    }
  }

  /**
   * 验证识别结果
   */
  validateResult(result: OCRResult): boolean {
    if (!result.text || result.text.trim().length === 0) {
      return false;
    }

    // 检查置信度
    if (result.confidence < 0.3) {
      return false;
    }

    // 检查是否包含有意义的文字（至少包含一些中文字符或英文单词）
    const hasChineseChars = /[\u4e00-\u9fff]/.test(result.text);
    const hasEnglishWords = /[a-zA-Z]{2,}/.test(result.text);
    
    return hasChineseChars || hasEnglishWords;
  }

  /**
   * 清理识别结果
   */
  cleanupResult(result: OCRResult): OCRResult {
    let cleanedText = result.text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除特殊字符（保留基本标点）
      .replace(/[^\u4e00-\u9fff\w\s.,!?;:""''()（）]/g, '')
      // 修正常见的OCR错误
      .replace(/[0O]/g, (match, offset, string) => {
        // 根据上下文判断是数字0还是字母O
        const before = string[offset - 1];
        const after = string[offset + 1];
        if (/\d/.test(before) || /\d/.test(after)) {
          return '0';
        }
        return 'O';
      })
      .trim();

    return {
      ...result,
      text: cleanedText
    };
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'zh-Hans', name: '简体中文' },
      { code: 'zh-Hant', name: '繁体中文' },
      { code: 'en', name: 'English' },
      { code: 'zh-Hans+en', name: '中英混合' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' }
    ];
  }

  /**
   * 设置OCR配置
   */
  setConfig(config: Partial<OCRConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出服务实例创建函数
export const createOCRService = (config?: OCRConfig): OCRService => {
  return new OCRService(config);
};

// 导出默认实例
export const ocrService = new OCRService();

export default OCRService;