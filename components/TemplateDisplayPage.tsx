/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Template } from '../App';
import Spinner from './Spinner';
import { hybridImageService } from '../services/hybridImageService';
import { TemplateService } from '../services/templateService';
import { PaintBrushIcon, CopyIcon, CheckIcon, ZoomInIcon } from './icons';
import ImageLightbox from './ImageLightbox';

interface TemplateDisplayPageProps {
  template: Template;
  onBack: () => void;
  onUseInEditor: (template: Template) => void;
}

const ImagePanel: React.FC<{ title: string; imageUrl: string | null; isLoading: boolean; error?: string | null }> = ({ title, imageUrl, isLoading, error }) => {
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <h3 className="text-xl font-semibold text-gray-300">{title}</h3>
      <div className="w-full aspect-video bg-gray-900/50 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <Spinner className="w-12 h-12 text-blue-400" />
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <p className="font-bold">生成失败</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        ) : imageUrl ? (
          <motion.img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ) : null}
      </div>
    </div>
  );
};

const TemplateDisplayPage: React.FC<TemplateDisplayPageProps> = ({ template, onBack, onUseInEditor }) => {
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Effect to load "before" image and "after" preview on mount
  useEffect(() => {
    let beforeObjectUrl: string | null = null;
    let afterObjectUrl: string | null = null;
    
    const loadImages = async () => {
      setError(null);
      try {
        const originalBeforeUrl = template.example_images?.[0] || template.baseUrl || template.cover_image_url;
        const originalAfterUrl = template.cover_image_url || template.iconUrl;
        
        console.log('🖼️ 原始图片URL:', { originalBeforeUrl, originalAfterUrl });
        
        if (!originalBeforeUrl || !originalAfterUrl) {
          throw new Error('模板图片URL不完整');
        }
        
        // 使用代理API来避免CORS问题
        const beforeUrl = `/api/proxy-image?url=${encodeURIComponent(originalBeforeUrl)}`;
        const afterUrl = `/api/proxy-image?url=${encodeURIComponent(originalAfterUrl)}`;
        
        console.log('🔄 使用代理URL:', { beforeUrl, afterUrl });
        
        const [beforeResponse, afterResponse] = await Promise.all([
          fetch(beforeUrl),
          fetch(afterUrl)
        ]);

        if (!beforeResponse.ok) {
          console.error('❌ 原始图片加载失败:', beforeResponse.status, beforeResponse.statusText);
          throw new Error('无法加载原始图片。');
        }
        
        if (!afterResponse.ok) {
          console.error('❌ 预览图片加载失败:', afterResponse.status, afterResponse.statusText);
          throw new Error('无法加载预览图片。');
        }
        
        const beforeBlob = await beforeResponse.blob();
        beforeObjectUrl = URL.createObjectURL(beforeBlob);
        setBeforeImageUrl(beforeObjectUrl);
        const fileName = (template.baseUrl || beforeUrl).split('/').pop() || 'template.jpg';
        const imageFile = new File([beforeBlob], fileName, { type: beforeBlob.type });
        setBeforeImageFile(imageFile);

        const afterBlob = await afterResponse.blob();
        afterObjectUrl = URL.createObjectURL(afterBlob);
        setAfterPreviewUrl(afterObjectUrl);

      } catch (err) {
        console.error("🚫 图片加载错误:", err);
        setError(err instanceof Error ? err.message : '发生未知错误。');
      }
    };

    loadImages();

    return () => {
      if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
      if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
    };
  }, [template]);
  
  const handleGenerateAfterImage = async () => {
    if (!beforeImageFile) {
        setError('原始图片文件不可用，无法生成。');
        return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
        const resultDataUrl = await hybridImageService.generateAdjustedImage(beforeImageFile, template.prompt);
        setAfterImageUrl(resultDataUrl);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
        setError(errorMessage);
        console.error("Error generating after image:", err);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(template.prompt).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const currentAfterImageUrl = afterImageUrl || afterPreviewUrl;

  return (
    <>
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{template.title || template.name}</h2>
          <p className="text-gray-400 text-lg mt-2 max-w-2xl mx-auto">{template.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ImagePanel title="原始图片 (Before)" imageUrl={beforeImageUrl} isLoading={!beforeImageUrl && !error} />
          
          <div className="w-full flex flex-col items-center gap-3">
              <h3 className="text-xl font-semibold text-gray-300">AI 生成效果 (After)</h3>
              <div 
                  className="relative w-full aspect-video bg-gray-900/50 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden group"
                  onClick={() => { if (currentAfterImageUrl) setIsLightboxOpen(true); }}
              >
                  {currentAfterImageUrl && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer">
                          <ZoomInIcon className="w-16 h-16 text-white" />
                      </div>
                  )}

                  {isGenerating ? (
                      <Spinner className="w-12 h-12 text-blue-400" />
                  ) : error && !afterImageUrl ? ( // Only show error if final gen failed, not if preview is fine
                      <div className="p-4 text-center text-red-400">
                          <p className="font-bold">生成失败</p>
                          <p className="text-xs mt-1">{error}</p>
                      </div>
                  ) : afterImageUrl ? (
                      <motion.img
                          key="after-generated"
                          src={afterImageUrl}
                          alt="AI 生成效果"
                          className="w-full h-full object-contain"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                  ) : afterPreviewUrl ? (
                      <motion.img
                          key="after-preview"
                          src={afterPreviewUrl}
                          alt="效果预览"
                          className="w-full h-full object-contain"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                  ) : (
                      <Spinner className="w-12 h-12 text-gray-500" />
                  )}
              </div>
              {!isGenerating && !afterImageUrl && (
                  <button
                      onClick={handleGenerateAfterImage}
                      disabled={!beforeImageFile || isGenerating}
                      className="mt-1 inline-flex items-center gap-3 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                      <PaintBrushIcon className="w-6 h-6"/>
                      {error ? '重试生成' : '生成来看看实际效果'}
                  </button>
              )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-400 font-semibold mb-2">所使用的提示词:</p>
          <div className="relative">
              <code className="block w-full text-gray-300 bg-gray-900/50 p-3 pr-12 rounded-md text-sm whitespace-pre-wrap">{template.prompt}</code>
              <button
                  onClick={handleCopyPrompt}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
                  title={copyStatus === 'copied' ? '已复制!' : '复制提示词'}
                  aria-label="复制提示词"
              >
                  {copyStatus === 'copied' ? (
                      <CheckIcon className="w-5 h-5 text-green-400" />
                  ) : (
                      <CopyIcon className="w-5 h-5" />
                  )}
              </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回
          </button>
          <button
            onClick={() => onUseInEditor(template)}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner"
          >
            使用此模板编辑图片
          </button>
        </div>
      </div>
      <ImageLightbox
        imageUrl={isLightboxOpen ? currentAfterImageUrl : null}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );
};

export default TemplateDisplayPage;
