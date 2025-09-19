import React, { useState, useCallback } from 'react';
import { Upload, X, Download, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { hybridImageService } from '../services/hybridImageService';
import Spinner from './Spinner';

interface ImageFile {
  file: File | null;
  preview: string | null;
  label: string;
  required: boolean;
}

interface MultiImageFusionProps {
  onBack?: () => void;
}

const MultiImageFusion: React.FC<MultiImageFusionProps> = ({ onBack }) => {
  const [images, setImages] = useState<{
    main: ImageFile;
    attachment1: ImageFile;
    attachment2: ImageFile;
  }>({
    main: { file: null, preview: null, label: '主图片（必须）', required: true },
    attachment1: { file: null, preview: null, label: '附件图片1（可选）', required: false },
    attachment2: { file: null, preview: null, label: '附件图片2（可选）', required: false }
  });

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理图片上传
  const handleImageUpload = useCallback((imageType: 'main' | 'attachment1' | 'attachment2', file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => ({
          ...prev,
          [imageType]: {
            ...prev[imageType],
            file,
            preview: e.target?.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // 移除图片
  const removeImage = useCallback((imageType: 'main' | 'attachment1' | 'attachment2') => {
    setImages(prev => ({
      ...prev,
      [imageType]: {
        ...prev[imageType],
        file: null,
        preview: null
      }
    }));
  }, []);

  // 生成融合图片
  const generateFusedImage = async () => {
    // 验证必须的主图片
    if (!images.main.file) {
      setError('请上传主图片');
      return;
    }

    // 验证提示词
    if (!prompt.trim()) {
      setError('请输入融合提示词');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // 构建融合提示词
      let fusionPrompt = prompt;
      const uploadedImages: File[] = [images.main.file];
      
      if (images.attachment1.file) {
        uploadedImages.push(images.attachment1.file);
        fusionPrompt += '\n[使用附件图片1]';
      }
      
      if (images.attachment2.file) {
        uploadedImages.push(images.attachment2.file);
        fusionPrompt += '\n[使用附件图片2]';
      }

      console.log('开始图片融合:', {
        主图片: images.main.file.name,
        附件1: images.attachment1.file?.name || '未上传',
        附件2: images.attachment2.file?.name || '未上传',
        提示词: fusionPrompt
      });

      // 调用融合服务
      const result = await hybridImageService.generateFusedImage(
        images.main.file,
        uploadedImages.slice(1), // 附件图片数组
        fusionPrompt
      );

      setGeneratedImage(result);
      console.log('图片融合成功');
    } catch (error) {
      console.error('图片融合失败:', error);
      setError(error instanceof Error ? error.message : '图片融合失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 下载生成的图片
  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `fusion_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 重新生成
  const regenerate = () => {
    generateFusedImage();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              AI 图片融合
            </h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：上传区域 */}
          <div className="space-y-6">
            {/* 图片上传区域 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">上传图片</h2>
              
              {/* 主图片上传 */}
              <div className="space-y-2">
                <label className="text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {images.main.label}
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  {images.main.preview ? (
                    <div className="relative group">
                      <img
                        src={images.main.preview}
                        alt="主图片"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage('main')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:border-white/50 transition-colors">
                      <Upload className="w-8 h-8 text-white/50 mb-2" />
                      <span className="text-white/50">点击上传主图片</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('main', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 附件图片1上传 */}
              <div className="space-y-2">
                <label className="text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {images.attachment1.label}
                </label>
                <div className="relative">
                  {images.attachment1.preview ? (
                    <div className="relative group">
                      <img
                        src={images.attachment1.preview}
                        alt="附件图片1"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage('attachment1')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:border-white/50 transition-colors">
                      <Upload className="w-8 h-8 text-white/50 mb-2" />
                      <span className="text-white/50">点击上传附件图片1</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('attachment1', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 附件图片2上传 */}
              <div className="space-y-2">
                <label className="text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {images.attachment2.label}
                </label>
                <div className="relative">
                  {images.attachment2.preview ? (
                    <div className="relative group">
                      <img
                        src={images.attachment2.preview}
                        alt="附件图片2"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage('attachment2')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:border-white/50 transition-colors">
                      <Upload className="w-8 h-8 text-white/50 mb-2" />
                      <span className="text-white/50">点击上传附件图片2</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('attachment2', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* 提示词输入区域 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">融合提示词</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：把主图片中的安全出口logo替换为附件图片1的内容，保持原始风格和布局..."
                className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
              />
              <p className="text-white/60 text-sm mt-2">
                描述如何融合这些图片，可以指定替换、合并或风格转换等操作
              </p>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={generateFusedImage}
              disabled={!images.main.file || !prompt.trim() || isGenerating}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Spinner size="small" />
                  <span>正在生成...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>开始融合</span>
                </>
              )}
            </button>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* 右侧：结果展示 */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">生成结果</h2>
            
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="生成的融合图片"
                    className="w-full rounded-lg"
                  />
                </div>
                
                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={downloadImage}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    下载图片
                  </button>
                  <button
                    onClick={regenerate}
                    disabled={isGenerating}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-5 h-5" />
                    重新生成
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-white/40">
                <ImageIcon className="w-16 h-16 mb-4" />
                <p>生成的图片将在这里显示</p>
                <p className="text-sm mt-2">上传图片并输入提示词后点击"开始融合"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiImageFusion;
