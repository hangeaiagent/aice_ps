/**
 * 照片上传组件
 * 支持拍照或选择图片，OCR识别文字内容
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
  acceptedFormats?: string[];
  maxFileSize?: number; // MB
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUpload,
  disabled = false,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // 验证文件类型
    if (!acceptedFormats.includes(file.type)) {
      setError('不支持的文件格式，请选择 JPG、PNG 或 WebP 格式的图片');
      return;
    }

    // 验证文件大小
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`文件大小超过限制，请选择小于 ${maxFileSize}MB 的图片`);
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 处理上传
    setIsProcessing(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('上传处理失败:', error);
      setError(error instanceof Error ? error.message : '上传处理失败');
    } finally {
      setIsProcessing(false);
    }
  }, [acceptedFormats, maxFileSize, onUpload]);

  /**
   * 文件输入变更
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * 拖拽处理
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  /**
   * 选择文件
   */
  const selectFile = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  /**
   * 拍照
   */
  const takePhoto = useCallback(() => {
    if (!disabled && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, [disabled]);

  /**
   * 清除预览
   */
  const clearPreview = useCallback(() => {
    setPreviewImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-md p-3"
          >
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 预览区域 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={previewImage}
                  alt="上传预览"
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  图片已上传
                </h4>
                {isProcessing ? (
                  <div className="flex items-center text-sm text-blue-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在识别文字...
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    文字识别完成，请查看识别结果
                  </p>
                )}
              </div>
              <button
                onClick={clearPreview}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 上传区域 */}
      {!previewImage && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : disabled
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            {/* 图标 */}
            <div className="flex justify-center">
              <svg
                className={`w-12 h-12 ${
                  disabled ? 'text-gray-300' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* 文字说明 */}
            <div>
              <p className={`text-lg font-medium ${
                disabled ? 'text-gray-400' : 'text-gray-700'
              }`}>
                上传包含文字的图片
              </p>
              <p className={`text-sm ${
                disabled ? 'text-gray-300' : 'text-gray-500'
              }`}>
                支持 JPG、PNG、WebP 格式，最大 {maxFileSize}MB
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center space-x-4">
              <motion.button
                type="button"
                onClick={takePhoto}
                disabled={disabled}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all ${
                  disabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                whileTap={!disabled ? { scale: 0.95 } : {}}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                拍照识别
              </motion.button>

              <motion.button
                type="button"
                onClick={selectFile}
                disabled={disabled}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-all ${
                  disabled
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                whileTap={!disabled ? { scale: 0.95 } : {}}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                选择图片
              </motion.button>
            </div>

            {/* 拖拽提示 */}
            {!disabled && (
              <p className="text-xs text-gray-400">
                或将图片拖拽到此处
              </p>
            )}
          </div>

          {/* 拖拽覆盖层 */}
          {dragActive && !disabled && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="text-blue-600 font-medium">
                松开鼠标上传图片
              </div>
            </div>
          )}
        </div>
      )}

      {/* 功能说明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="flex">
          <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">OCR文字识别功能</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>支持识别中文、英文等多种语言</li>
              <li>建议上传清晰、光线充足的图片</li>
              <li>文字内容越清晰，识别准确率越高</li>
              <li>识别后可以编辑和修正文字内容</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;