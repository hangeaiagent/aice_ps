/**
 * 文字转漫画主页面组件
 * 提供文字输入、处理进度显示、漫画展示等功能
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { createTextToComicService, type ComicProject, type ProcessingProgress } from '../services/textToComicService';
import { fontService, type FontSettings } from '../services/fontService';
import TextInput from './TextInput';
import ComicViewer from './ComicViewer';
import ProcessingProgress from './ProcessingProgress';
import FontToggle from './FontToggle';
import PhotoUpload from './PhotoUpload';
import ProjectsList from './ProjectsList';
import Spinner from './Spinner';

interface TextToComicPageProps {
  onBack?: () => void;
}

const TextToComicPage: React.FC<TextToComicPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'viewing'>('input');
  const [inputText, setInputText] = useState('');
  const [currentProject, setCurrentProject] = useState<ComicProject | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => 
    fontService.getRecommendedSettings('dyslexic')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  
  const textToComicService = useRef<any>(null);

  // 初始化服务
  useEffect(() => {
    const initializeService = () => {
      try {
        // 这里需要配置实际的API密钥
        textToComicService.current = createTextToComicService(
          process.env.REACT_APP_DEEPSEEK_API_KEY || '',
          {
            apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
            projectId: process.env.REACT_APP_GOOGLE_PROJECT_ID || ''
          }
        );
      } catch (error) {
        console.error('初始化服务失败:', error);
        setError('服务初始化失败，请检查配置');
      }
    };

    initializeService();
    
    // 预加载字体
    fontService.preloadAccessibleFonts();
  }, []);

  /**
   * 处理文本输入
   */
  const handleTextSubmit = useCallback(async (text: string, title?: string) => {
    if (!user || !textToComicService.current) {
      setError('请先登录或检查服务配置');
      return;
    }

    if (!text.trim()) {
      setError('请输入文本内容');
      return;
    }

    setInputText(text);
    setError(null);
    setIsLoading(true);

    try {
      // 创建项目
      const project = await textToComicService.current.createProject(
        user.id,
        title || '未命名故事',
        text,
        {
          style: '儿童漫画风格',
          fontFamily: fontSettings.fontFamily,
          fontSize: fontSettings.fontSize,
          targetAge: '6-12岁',
          aspectRatio: '4:3',
          maxScenes: 6,
          useDyslexicFont: fontSettings.fontFamily === 'OpenDyslexic'
        }
      );

      setCurrentProject(project);
      setCurrentStep('processing');

      // 开始处理
      await textToComicService.current.processTextToComic(
        project.id,
        (progress: ProcessingProgress) => {
          setProcessingProgress(progress);
        }
      );

      // 处理完成，获取最新项目状态
      const updatedProject = await textToComicService.current.getProject(project.id);
      setCurrentProject(updatedProject);
      setCurrentStep('viewing');

    } catch (error) {
      console.error('处理文本失败:', error);
      setError(error instanceof Error ? error.message : '处理失败');
      setCurrentStep('input');
    } finally {
      setIsLoading(false);
    }
  }, [user, fontSettings]);

  /**
   * 处理照片上传
   */
  const handlePhotoUpload = useCallback(async (imageFile: File) => {
    // TODO: 实现OCR文字识别
    console.log('处理照片上传:', imageFile);
    setError('照片文字识别功能正在开发中');
  }, []);

  /**
   * 字体设置变更
   */
  const handleFontChange = useCallback((newSettings: FontSettings) => {
    setFontSettings(newSettings);
  }, []);

  /**
   * 重新开始
   */
  const handleRestart = useCallback(() => {
    setCurrentStep('input');
    setCurrentProject(null);
    setProcessingProgress(null);
    setInputText('');
    setError(null);
  }, []);

  /**
   * 查看项目列表
   */
  const handleViewProjects = useCallback(() => {
    setShowProjects(true);
  }, []);

  /**
   * 选择已有项目
   */
  const handleSelectProject = useCallback((project: ComicProject) => {
    setCurrentProject(project);
    setShowProjects(false);
    if (project.status === 'completed') {
      setCurrentStep('viewing');
    } else if (project.status === 'processing') {
      setCurrentStep('processing');
    } else {
      setCurrentStep('input');
      setInputText(project.originalText);
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">请先登录</h2>
          <p className="text-gray-600">需要登录后才能使用文字转漫画功能</p>
        </div>
      </div>
    );
  }

  if (showProjects) {
    return (
      <ProjectsList
        userId={user.id}
        onSelectProject={handleSelectProject}
        onBack={() => setShowProjects(false)}
        textToComicService={textToComicService.current}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                文字转漫画绘本
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <FontToggle
                currentSettings={fontSettings}
                onSettingsChange={handleFontChange}
              />
              
              <button
                onClick={handleViewProjects}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                我的项目
              </button>
              
              {currentStep !== 'input' && (
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                >
                  重新开始
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-md p-4"
          >
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 文字输入区域 */}
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      输入文字内容
                    </h2>
                    <TextInput
                      value={inputText}
                      onChange={setInputText}
                      onSubmit={handleTextSubmit}
                      placeholder="请输入您想要转换为漫画的文字内容..."
                      fontSettings={fontSettings}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      或拍照上传文字
                    </h2>
                    <PhotoUpload
                      onUpload={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* 功能介绍区域 */}
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      功能特色
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1h-6a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">智能情节提取</h3>
                          <p className="text-sm text-gray-600">使用AI分析文本，自动提取关键情节和对话</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">自动生成漫画</h3>
                          <p className="text-sm text-gray-600">根据情节描述生成精美的漫画插图</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">阅读障碍友好</h3>
                          <p className="text-sm text-gray-600">使用OpenDyslexic字体，帮助阅读障碍儿童</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">保留原文</h3>
                          <p className="text-sm text-gray-600">原始文字完整保留，家长老师放心</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      使用说明
                    </h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>在左侧输入框中粘贴或输入要转换的文字内容</li>
                      <li>也可以拍照上传包含文字的图片（OCR识别）</li>
                      <li>点击"开始转换"按钮，AI将自动分析文本</li>
                      <li>等待系统生成漫画绘本（通常需要1-3分钟）</li>
                      <li>查看生成的漫画，可切换字体和调整设置</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <ProcessingProgress
                progress={processingProgress}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {currentStep === 'viewing' && currentProject && (
            <motion.div
              key="viewing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ComicViewer
                project={currentProject}
                fontSettings={fontSettings}
                textToComicService={textToComicService.current}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TextToComicPage;