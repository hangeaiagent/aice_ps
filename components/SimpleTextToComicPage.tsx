import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpenIcon, 
  CameraIcon, 
  SparklesIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { textToComicService } from '../services/textToComicService';
import Spinner from './Spinner';

interface ComicPanel {
  id: string;
  text: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

const SimpleTextToComicPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 生成漫画
  const handleGenerateComic = async () => {
    if (!inputText.trim()) {
      setError('请输入文字内容');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPanels([]);

    try {
      // 步骤1: 提取关键场景
      const keyScenes = await textToComicService.extractKeyScenes(inputText);
      
      // 创建面板
      const newPanels: ComicPanel[] = keyScenes.scenes.map((scene, index) => ({
        id: `panel-${index}`,
        text: scene.text,
        isGenerating: true
      }));
      
      setPanels(newPanels);
      setCurrentPanelIndex(0);

      // 步骤2: 逐个生成漫画图片
      const updatedPanels = [...newPanels];
      
      for (let i = 0; i < keyScenes.scenes.length; i++) {
        try {
          const scene = keyScenes.scenes[i];
          const imageUrl = await textToComicService.generateComicPanel(
            scene.description,
            keyScenes.style || 'cartoon',
            scene
          );
          
          updatedPanels[i] = {
            ...updatedPanels[i],
            imageUrl,
            isGenerating: false
          };
          
          // 实时更新显示
          setPanels([...updatedPanels]);
        } catch (err) {
          updatedPanels[i] = {
            ...updatedPanels[i],
            isGenerating: false
          };
        }
      }

    } catch (err) {
      setError('生成漫画失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 导航到下一个面板
  const nextPanel = () => {
    if (currentPanelIndex < panels.length - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1);
    }
  };

  // 导航到上一个面板
  const prevPanel = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1);
    }
  };

  const currentPanel = panels[currentPanelIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 头部介绍 */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <BookOpenIcon className="w-16 h-16 text-orange-400" />
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                慢光绘本
              </h1>
              <p className="text-xl text-gray-300 mt-2">让阅读变成看绘本</p>
            </div>
          </motion.div>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            专为阅读障碍儿童设计，将文字转换为生动的漫画故事，让理解更轻松，阅读更有趣
          </p>
          
        </div>

        {/* 输入区域 */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <label className="block text-lg font-medium text-gray-300 mb-4">
              输入您的故事文字
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入故事内容，比如：小明今天去公园玩。他看到了美丽的花朵，还遇到了一只可爱的小狗..."
              className="w-full h-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-lg leading-relaxed"
            />
            
            <div className="flex justify-center mt-6">
              <motion.button
                onClick={handleGenerateComic}
                disabled={isProcessing || !inputText.trim()}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isProcessing ? (
                  <>
                    <Spinner className="w-6 h-6" />
                    生成中...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    生成漫画绘本
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto mb-6"
            >
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-center">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 漫画显示区域 */}
        <AnimatePresence>
          {panels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                {/* 进度指示器 */}
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-2">
                    {panels.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentPanelIndex
                            ? 'bg-orange-400'
                            : index < currentPanelIndex
                            ? 'bg-green-400'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 当前面板 */}
                {currentPanel && (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* 漫画图片 */}
                    <div className="order-2 md:order-1">
                      <div className="aspect-square bg-gray-700/50 rounded-xl border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                        {currentPanel.isGenerating ? (
                          <div className="text-center">
                            <Spinner className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                            <p className="text-gray-400">正在生成漫画...</p>
                          </div>
                        ) : currentPanel.imageUrl ? (
                          <img
                            src={currentPanel.imageUrl}
                            alt={`漫画场景 ${currentPanelIndex + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center text-gray-400">
                            <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                            <p>图片生成失败</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 文字内容 */}
                    <div className="order-1 md:order-2">
                      <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600">
                        <h3 className="text-lg font-medium text-orange-400 mb-4">
                          第 {currentPanelIndex + 1} 幕
                        </h3>
                        <p className="text-xl leading-relaxed text-gray-200">
                          {currentPanel.text}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 导航按钮 */}
                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={prevPanel}
                    disabled={currentPanelIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                    上一幕
                  </button>

                  <span className="text-gray-400">
                    {currentPanelIndex + 1} / {panels.length}
                  </span>

                  <button
                    onClick={nextPanel}
                    disabled={currentPanelIndex === panels.length - 1}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一幕
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 功能介绍 */}
        {panels.length === 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto mt-16"
          >
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">智能理解</h3>
                <p className="text-gray-400">AI自动分析文字内容，提取关键情节</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SparklesIcon className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">生动绘制</h3>
                <p className="text-gray-400">将文字转换为生动的漫画场景</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhotoIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">友好阅读</h3>
                <p className="text-gray-400">使用阅读障碍友好字体，降低阅读难度</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SimpleTextToComicPage;
