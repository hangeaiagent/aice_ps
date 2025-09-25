/**
 * 漫画查看器组件
 * 展示生成的漫画页面，支持翻页、字体切换、文本框编辑等功能
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fontService, type FontSettings } from '../services/fontService';
import { type ComicProject, type ComicPage } from '../services/textToComicService';

interface ComicViewerProps {
  project: ComicProject;
  fontSettings: FontSettings;
  textToComicService: any;
}

const ComicViewer: React.FC<ComicViewerProps> = ({
  project,
  fontSettings,
  textToComicService
}) => {
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingTextBox, setEditingTextBox] = useState<string | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);

  // 加载漫画页面
  useEffect(() => {
    const loadPages = async () => {
      if (!textToComicService || !project.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const projectPages = await textToComicService.getProjectPages(project.id);
        setPages(projectPages);
      } catch (error) {
        console.error('加载页面失败:', error);
        setError(error instanceof Error ? error.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadPages();
  }, [project.id, textToComicService]);

  /**
   * 翻页控制
   */
  const goToPage = useCallback((index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
    }
  }, [pages.length]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPageIndex - 1);
  }, [currentPageIndex, goToPage]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [currentPageIndex, goToPage]);

  /**
   * 键盘导航
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) {
        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            goToPreviousPage();
            break;
          case 'ArrowRight':
          case 'ArrowDown':
          case ' ':
            e.preventDefault();
            goToNextPage();
            break;
          case 'Escape':
            e.preventDefault();
            setIsFullscreen(false);
            break;
          case 'Home':
            e.preventDefault();
            goToPage(0);
            break;
          case 'End':
            e.preventDefault();
            goToPage(pages.length - 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, goToPreviousPage, goToNextPage, goToPage, pages.length]);

  /**
   * 全屏切换
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  /**
   * 下载漫画
   */
  const handleDownload = useCallback(async () => {
    // TODO: 实现下载功能
    console.log('下载漫画功能开发中');
  }, []);

  /**
   * 分享漫画
   */
  const handleShare = useCallback(async () => {
    // TODO: 实现分享功能
    console.log('分享漫画功能开发中');
  }, []);

  /**
   * 编辑文本框
   */
  const handleEditTextBox = useCallback((textBoxId: string) => {
    setEditingTextBox(textBoxId);
  }, []);

  /**
   * 保存文本框编辑
   */
  const handleSaveTextBox = useCallback((textBoxId: string, newText: string) => {
    // TODO: 实现文本框编辑保存
    console.log('保存文本框:', textBoxId, newText);
    setEditingTextBox(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载漫画...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">加载失败</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">暂无内容</h3>
        <p className="text-yellow-600">该项目还没有生成漫画页面</p>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className={`comic-viewer ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`} ref={viewerRef}>
      {/* 工具栏 */}
      <div className={`flex items-center justify-between p-4 ${isFullscreen ? 'bg-black text-white' : 'bg-white border-b'}`}>
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">{project.title}</h2>
          <span className="text-sm text-gray-500">
            {currentPageIndex + 1} / {pages.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOriginalText(!showOriginalText)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              showOriginalText 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showOriginalText ? '隐藏原文' : '显示原文'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className={`flex ${isFullscreen ? 'h-full' : 'min-h-96'}`}>
        {/* 原文显示区域 */}
        <AnimatePresence>
          {showOriginalText && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '300px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`border-r overflow-hidden ${isFullscreen ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}
            >
              <div className="p-4 h-full overflow-y-auto">
                <h3 className="font-semibold mb-4">原文内容</h3>
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={fontService.createFontSettings(fontSettings.fontFamily, 14)}
                >
                  {project.originalText}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 漫画显示区域 */}
        <div className="flex-1 flex flex-col">
          {/* 漫画页面 */}
          <div className={`flex-1 flex items-center justify-center p-4 ${isFullscreen ? 'bg-black' : 'bg-gray-100'}`}>
            <div className="relative max-w-4xl w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  {/* 漫画图像 */}
                  {currentPage.imageUrl ? (
                    <img
                      src={currentPage.imageUrl}
                      alt={`漫画第${currentPageIndex + 1}页`}
                      className="w-full h-auto"
                      style={{ maxHeight: isFullscreen ? '80vh' : '60vh', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>图像生成中...</p>
                      </div>
                    </div>
                  )}

                  {/* 文本框覆盖层 */}
                  {currentPage.textBoxes && currentPage.textBoxes.map((textBox) => (
                    <div
                      key={textBox.id}
                      className={`comic-text-box ${textBox.boxType} ${editingTextBox === textBox.id ? 'editable' : ''}`}
                      style={{
                        left: `${textBox.positionX}px`,
                        top: `${textBox.positionY}px`,
                        width: `${textBox.width}px`,
                        height: `${textBox.height}px`,
                        fontFamily: fontSettings.fontFamily === 'OpenDyslexic' ? 'OpenDyslexic, Comic Sans MS, sans-serif' : textBox.fontFamily,
                        fontSize: `${fontSettings.fontSize}px`,
                        color: textBox.textColor,
                        backgroundColor: textBox.backgroundColor
                      }}
                      onClick={() => handleEditTextBox(textBox.id)}
                    >
                      {editingTextBox === textBox.id ? (
                        <input
                          type="text"
                          defaultValue={textBox.textContent}
                          className="w-full h-full bg-transparent border-none outline-none text-center"
                          onBlur={(e) => handleSaveTextBox(textBox.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveTextBox(textBox.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingTextBox(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        textBox.textContent
                      )}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* 导航按钮 */}
              {pages.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPageIndex === 0}
                    className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                      currentPageIndex === 0 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 shadow-lg'
                    } transition-all`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPageIndex === pages.length - 1}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                      currentPageIndex === pages.length - 1 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 shadow-lg'
                    } transition-all`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 页面指示器 */}
          {pages.length > 1 && (
            <div className={`flex justify-center py-4 ${isFullscreen ? 'bg-black' : 'bg-white'}`}>
              <div className="flex space-x-2">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentPageIndex 
                        ? 'bg-blue-600 scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 页面信息 */}
      {currentPage && (
        <div className={`p-4 border-t ${isFullscreen ? 'bg-gray-900 text-white border-gray-700' : 'bg-white'}`}>
          <div className="max-w-4xl mx-auto">
            <h3 className="font-semibold mb-2">{currentPage.sceneDescription}</h3>
            {currentPage.dialogue && (
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                <strong>对话：</strong>{currentPage.dialogue}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComicViewer;