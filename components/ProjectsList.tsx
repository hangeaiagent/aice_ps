/**
 * 项目列表组件
 * 显示用户的漫画项目历史，支持查看、删除、重新处理等操作
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ComicProject } from '../services/textToComicService';

interface ProjectsListProps {
  userId: string;
  onSelectProject: (project: ComicProject) => void;
  onBack: () => void;
  textToComicService: any;
}

const ProjectsList: React.FC<ProjectsListProps> = ({
  userId,
  onSelectProject,
  onBack,
  textToComicService
}) => {
  const [projects, setProjects] = useState<ComicProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      if (!textToComicService) return;

      setIsLoading(true);
      setError(null);

      try {
        const userProjects = await textToComicService.getUserProjects(userId);
        setProjects(userProjects);
      } catch (error) {
        console.error('加载项目列表失败:', error);
        setError(error instanceof Error ? error.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [userId, textToComicService]);

  /**
   * 删除项目
   */
  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!textToComicService) return;

    const confirmed = window.confirm('确定要删除这个项目吗？此操作不可撤销。');
    if (!confirmed) return;

    setDeletingProject(projectId);

    try {
      await textToComicService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('删除项目失败:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setDeletingProject(null);
    }
  }, [textToComicService]);

  /**
   * 获取状态显示信息
   */
  const getStatusInfo = (status: ComicProject['status']) => {
    switch (status) {
      case 'completed':
        return {
          text: '已完成',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'processing':
        return {
          text: '处理中',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        };
      case 'failed':
        return {
          text: '处理失败',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          text: '待处理',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  /**
   * 过滤项目
   */
  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  /**
   * 格式化日期
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在加载项目列表...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">我的漫画项目</h1>
            </div>

            {/* 过滤器 */}
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部项目</option>
                <option value="completed">已完成</option>
                <option value="processing">处理中</option>
                <option value="failed">处理失败</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? '暂无项目' : '没有符合条件的项目'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? '开始创建您的第一个漫画项目吧！' 
                : '试试调整过滤条件或创建新项目'
              }
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建新项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProjects.map((project) => {
                const statusInfo = getStatusInfo(project.status);
                
                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
                  >
                    {/* 项目卡片头部 */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {project.title}
                        </h3>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span className="ml-1">{statusInfo.text}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {project.originalText.length > 120 
                          ? project.originalText.substring(0, 120) + '...'
                          : project.originalText
                        }
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>创建于 {formatDate(project.createdAt)}</span>
                        {project.extractedPlot && (
                          <span>{project.extractedPlot.totalScenes} 个场景</span>
                        )}
                      </div>
                    </div>

                    {/* 项目操作 */}
                    <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                      <button
                        onClick={() => onSelectProject(project)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        {project.status === 'completed' ? '查看漫画' : '继续编辑'}
                      </button>

                      <div className="flex items-center space-x-2">
                        {project.status === 'failed' && (
                          <button
                            onClick={() => {
                              // TODO: 实现重新处理
                              console.log('重新处理项目:', project.id);
                            }}
                            className="p-1.5 text-yellow-600 hover:text-yellow-700 transition-colors"
                            title="重新处理"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deletingProject === project.id}
                          className="p-1.5 text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                          title="删除项目"
                        >
                          {deletingProject === project.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsList;