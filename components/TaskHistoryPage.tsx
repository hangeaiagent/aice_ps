/**
 * 任务记录页面组件
 * 功能: 显示用户的图片生成任务历史记录和统计信息
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  CurrencyDollarIcon,
  PhotoIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { taskHistoryService, TaskRecord, TaskStatistics, TaskQueryParams } from '../services/taskHistoryService';
import Spinner from './Spinner';
import ImageLightbox from './ImageLightbox';

interface TaskHistoryPageProps {
  onBack: () => void;
}

const TaskHistoryPage: React.FC<TaskHistoryPageProps> = ({ onBack }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // 筛选状态
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  
  // UI状态
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showStatistics, setShowStatistics] = useState(true);

  // 默认设置最近30天
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // 加载任务列表
  const loadTasks = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: TaskQueryParams = {
        page,
        limit: 50,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: statusFilter || undefined,
        task_type: taskTypeFilter || undefined
      };

      const result = await taskHistoryService.getTasks(params);
      
      setTasks(result.tasks);
      setCurrentPage(result.pagination.current_page);
      setTotalPages(result.pagination.total_pages);
      setHasMore(result.pagination.has_more);

    } catch (err) {
      console.error('加载任务列表失败:', err);
      setError(err instanceof Error ? err.message : '加载任务列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      const result = await taskHistoryService.getStatistics('daily', startDate, endDate);
      setStatistics(result.totals);
    } catch (err) {
      console.error('加载统计信息失败:', err);
    }
  };

  // 初始加载和筛选变化时重新加载
  useEffect(() => {
    if (startDate && endDate) {
      loadTasks(1);
      loadStatistics();
    }
  }, [startDate, endDate, statusFilter, taskTypeFilter]);

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务记录吗？此操作不可恢复。')) {
      return;
    }

    try {
      await taskHistoryService.deleteTask(taskId);
      // 重新加载当前页
      await loadTasks(currentPage);
      await loadStatistics();
    } catch (err) {
      console.error('删除任务失败:', err);
      alert('删除任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化时长
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      pending: { text: '等待中', color: 'text-yellow-500 bg-yellow-100' },
      processing: { text: '处理中', color: 'text-blue-500 bg-blue-100' },
      completed: { text: '已完成', color: 'text-green-500 bg-green-100' },
      failed: { text: '失败', color: 'text-red-500 bg-red-100' }
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: 'text-gray-500 bg-gray-100' };
  };

  // 获取任务类型显示
  const getTaskTypeDisplay = (taskType: string) => {
    const typeMap = {
      image_generation: '图片生成',
      image_edit: '图片编辑',
      template_generation: '模板生成'
    };
    return typeMap[taskType as keyof typeof typeMap] || taskType;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">任务记录</h1>
          <p className="text-gray-400">查看您的图片生成历史和统计信息</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          返回
        </button>
      </div>

      {/* 统计信息卡片 */}
      {showStatistics && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">总任务数</p>
                <p className="text-2xl font-bold text-white">{statistics.total_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">成功率</p>
                <p className="text-2xl font-bold text-green-400">{statistics.success_rate}%</p>
              </div>
              <CpuChipIcon className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">消耗积分</p>
                <p className="text-2xl font-bold text-yellow-400">{statistics.total_credits_deducted}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">平均耗时</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatDuration(statistics.avg_generation_time_ms)}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">全部状态</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
              <option value="processing">处理中</option>
              <option value="pending">等待中</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">任务类型</label>
            <select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">全部类型</option>
              <option value="image_generation">图片生成</option>
              <option value="image_edit">图片编辑</option>
              <option value="template_generation">模板生成</option>
            </select>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">任务列表</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-400">
            <p>{error}</p>
            <button
              onClick={() => loadTasks(currentPage)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              重试
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <PhotoIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">暂无任务记录</p>
            <p className="text-sm mt-2">开始生成图片后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 任务信息 */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusDisplay(task.status).color}`}>
                        {getStatusDisplay(task.status).text}
                      </span>
                      <span className="text-sm text-gray-400">
                        {getTaskTypeDisplay(task.task_type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(task.created_at!)}
                      </span>
                    </div>

                    {/* 提示词 */}
                    <div className="mb-3">
                      <p className="text-white font-medium mb-1">提示词:</p>
                      <p className="text-gray-300 text-sm line-clamp-2">{task.prompt}</p>
                    </div>

                    {/* 图片预览 */}
                    <div className="flex gap-4 mb-3">
                      {task.original_image_url && (
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-gray-400 mb-1">原始图片</p>
                          <img
                            src={task.original_image_url}
                            alt="原始图片"
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(task.original_image_url!)}
                          />
                        </div>
                      )}
                      {task.generated_image_url && (
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-gray-400 mb-1">生成图片</p>
                          <img
                            src={task.generated_image_url}
                            alt="生成图片"
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(task.generated_image_url!)}
                          />
                        </div>
                      )}
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      {task.tokens_used !== undefined && (
                        <span className="flex items-center gap-1">
                          <CpuChipIcon className="w-4 h-4" />
                          {task.tokens_used} tokens
                        </span>
                      )}
                      {task.credits_deducted !== undefined && (
                        <span className="flex items-center gap-1">
                          <CurrencyDollarIcon className="w-4 h-4" />
                          {task.credits_deducted} 积分
                        </span>
                      )}
                      {task.generation_time_ms !== undefined && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {formatDuration(task.generation_time_ms)}
                        </span>
                      )}
                    </div>

                    {/* 错误信息 */}
                    {task.error_message && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <p className="text-red-300 text-sm">{task.error_message}</p>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="查看详情"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id!)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="删除记录"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTasks(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => loadTasks(currentPage + 1)}
                disabled={!hasMore}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 图片灯箱 */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};

export default TaskHistoryPage;
