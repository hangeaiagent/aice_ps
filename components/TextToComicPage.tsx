import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpenIcon, 
  CameraIcon, 
  SparklesIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  DownloadIcon,
  RefreshIcon,
  XMarkIcon,
  DocumentTextIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { textToComicService } from '../services/textToComicService';
import Spinner from './Spinner';

interface ComicPanel {
  id: string;
  text: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

interface ComicBook {
  title: string;
  originalText: string;
  panels: ComicPanel[];
  createdAt: Date;
}

const TextToComicPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [comicBook, setComicBook] = useState<ComicBook | null>(null);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'comic' | 'text'>('split');
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 从图片中提取文字 (OCR)
  const handleExtractTextFromImage = async () => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const extractedText = await textToComicService.extractTextFromImage(uploadedImage);
      setInputText(extractedText);
      setImagePreview(null);
      setUploadedImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文字提取失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 生成漫画
  const handleGenerateComic = async () => {
    if (!inputText.trim()) {
      setError('请输入文字内容');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setComicBook(null);

    try {
      // 步骤1: 使用 Deepseek 提取关键情节
      const keyScenes = await textToComicService.extractKeyScenes(inputText);
      
      // 创建初始漫画书结构
      const newComicBook: ComicBook = {
        title: keyScenes.title || '我的漫画故事',
        originalText: inputText,
        panels: keyScenes.scenes.map((scene, index) => ({
          id: `panel-${index}`,
          text: scene.text,
          isGenerating: true
        })),
        createdAt: new Date()
      };
      
      setComicBook(newComicBook);
      setCurrentPanelIndex(0);

      // 步骤2: 为每个场景生成漫画图片
      const updatedPanels = [...newComicBook.panels];
      
      for (let i = 0; i < keyScenes.scenes.length; i++) {
        try {
          const imageUrl = await textToComicService.generateComicPanel(
            keyScenes.scenes[i].description,
            keyScenes.style || 'cartoon'
          );
          
          updatedPanels[i] = {
            ...updatedPanels[i],
            imageUrl,
            isGenerating: false
          };
          
          // 实时更新显示
          setComicBook(prev => prev ? {
            ...prev,
            panels: [...updatedPanels]
          } : null);
        } catch (err) {
          updatedPanels[i] = {
            ...updatedPanels[i],
            isGenerating: false,
            error: '生成失败'
          };
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '生成漫画失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 重新生成单个面板
  const handleRegeneratePanel = async (panelIndex: number) => {
    if (!comicBook) return;
    
    const panel = comicBook.panels[panelIndex];
    const updatedPanels = [...comicBook.panels];
    updatedPanels[panelIndex] = { ...panel, isGenerating: true, error: undefined };
    
    setComicBook({ ...comicBook, panels: updatedPanels });

    try {
      const imageUrl = await textToComicService.generateComicPanel(
        panel.text,
        'cartoon'
      );
      
      updatedPanels[panelIndex] = {
        ...panel,
        imageUrl,
        isGenerating: false
      };
      
      setComicBook({ ...comicBook, panels: updatedPanels });
    } catch (err) {
      updatedPanels[panelIndex] = {
        ...panel,
        isGenerating: false,
        error: '重新生成失败'
      };
      setComicBook({ ...comicBook, panels: updatedPanels });
    }
  };

  // 导出漫画
  const handleExportComic = () => {
    if (!comicBook) return;
    
    const exportData = {
      title: comicBook.title,
      originalText: comicBook.originalText,
      panels: comicBook.panels.map(p => ({
        text: p.text,
        imageUrl: p.imageUrl
      })),
      createdAt: comicBook.createdAt
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comic-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导航控制
  const goToPreviousPanel = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1);
    }
  };

  const goToNextPanel = () => {
    if (comicBook && currentPanelIndex < comicBook.panels.length - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">文字转漫画</h1>
            <span className="text-sm text-gray-400 ml-2">让阅读变成看绘本</span>
          </div>
          
          {comicBook && (
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === 'split' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                分屏模式
              </button>
              <button
                onClick={() => setViewMode('comic')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === 'comic' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                漫画模式
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === 'text' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                文字模式
              </button>
            </div>
          )}
        </div>

        {!comicBook ? (
          // 输入界面
          <div className="space-y-6">
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-200">输入文字内容</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <CameraIcon className="w-5 h-5" />
                    上传图片
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="上传的图片" 
                      className="w-full max-h-64 object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setUploadedImage(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-all"
                    >
                      <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <button
                    onClick={handleExtractTextFromImage}
                    disabled={isProcessing}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner className="w-5 h-5" />
                        正在提取文字...
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="w-5 h-5" />
                        提取文字
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="请输入或粘贴文字内容，比如一段故事、文章或阅读理解材料..."
                  className="w-full h-48 bg-gray-800 text-gray-200 rounded-lg p-4 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none font-dyslexic"
                  style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
                />
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateComic}
              disabled={isProcessing || !inputText.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 font-semibold text-lg shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Spinner className="w-6 h-6" />
                  AI 正在创作漫画...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-6 h-6" />
                  生成漫画
                </>
              )}
            </button>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">功能特点</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• 自动提取文章关键情节</li>
                <li>• 生成配套漫画插图</li>
                <li>• 保留原文，使用阅读障碍友好字体</li>
                <li>• 支持拍照上传文字识别</li>
              </ul>
            </div>
          </div>
        ) : (
          // 漫画展示界面
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{comicBook.title}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportComic}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  导出
                </button>
                <button
                  onClick={() => {
                    setComicBook(null);
                    setInputText('');
                    setCurrentPanelIndex(0);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                >
                  重新开始
                </button>
              </div>
            </div>

            {viewMode === 'split' && (
              // 分屏模式 - 左图右文
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {comicBook.panels[currentPanelIndex].isGenerating ? (
                      <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                        <Spinner className="w-12 h-12 text-blue-400" />
                      </div>
                    ) : comicBook.panels[currentPanelIndex].imageUrl ? (
                      <img 
                        src={comicBook.panels[currentPanelIndex].imageUrl}
                        alt={`Panel ${currentPanelIndex + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ) : (
                      <div className="aspect-square bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-4">
                        <PhotoIcon className="w-16 h-16 text-gray-600" />
                        {comicBook.panels[currentPanelIndex].error && (
                          <p className="text-red-400 text-sm">{comicBook.panels[currentPanelIndex].error}</p>
                        )}
                        <button
                          onClick={() => handleRegeneratePanel(currentPanelIndex)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
                        >
                          <RefreshIcon className="w-5 h-5" />
                          重新生成
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={goToPreviousPanel}
                        disabled={currentPanelIndex === 0}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-all"
                      >
                        <ArrowLeftIcon className="w-5 h-5" />
                      </button>
                      
                      <span className="text-gray-400">
                        {currentPanelIndex + 1} / {comicBook.panels.length}
                      </span>
                      
                      <button
                        onClick={goToNextPanel}
                        disabled={currentPanelIndex === comicBook.panels.length - 1}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-all"
                      >
                        <ArrowRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-6">
                    <p 
                      className="text-gray-200 leading-relaxed text-lg"
                      style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
                    >
                      {comicBook.panels[currentPanelIndex].text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'comic' && (
              // 纯漫画模式
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comicBook.panels.map((panel, index) => (
                  <motion.div
                    key={panel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-900/50 rounded-xl p-4 border border-gray-700"
                  >
                    {panel.isGenerating ? (
                      <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                        <Spinner className="w-12 h-12 text-blue-400" />
                      </div>
                    ) : panel.imageUrl ? (
                      <img 
                        src={panel.imageUrl}
                        alt={`Panel ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center mb-3">
                        <button
                          onClick={() => handleRegeneratePanel(index)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                        >
                          <RefreshIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <p 
                      className="text-gray-300 text-sm"
                      style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
                    >
                      {panel.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {viewMode === 'text' && (
              // 纯文字模式（带友好字体）
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <div 
                  className="text-gray-200 leading-relaxed text-lg space-y-4"
                  style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
                >
                  {comicBook.panels.map((panel, index) => (
                    <p key={panel.id} className="mb-4">
                      <span className="text-blue-400 font-semibold mr-2">[场景 {index + 1}]</span>
                      {panel.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TextToComicPage;