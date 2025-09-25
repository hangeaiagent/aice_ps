/**
 * 处理进度组件
 * 显示文本转漫画的处理进度和状态
 */

import React from 'react';
import { motion } from 'framer-motion';
import { type ProcessingProgress as ProgressType } from '../services/textToComicService';

interface ProcessingProgressProps {
  progress: ProgressType | null;
  isLoading: boolean;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  progress,
  isLoading
}) => {
  if (!progress && !isLoading) {
    return null;
  }

  const steps = [
    { id: 1, name: '提取关键情节', description: '分析文本内容，提取故事情节' },
    { id: 2, name: '创建页面结构', description: '根据情节创建漫画页面' },
    { id: 3, name: '生成漫画图像', description: '使用AI生成精美插图' },
    { id: 4, name: '添加文字内容', description: '添加对话框和文字' }
  ];

  const currentStep = progress?.currentStep || 1;
  const progressPercent = progress?.progress || 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">正在生成漫画绘本</h2>
          <p className="text-gray-600">请耐心等待，这通常需要1-3分钟</p>
        </div>

        {/* 总进度条 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress?.message || '正在处理...'}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="space-y-4">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isPending = currentStep < step.id;

            return (
              <motion.div
                key={step.id}
                className={`flex items-center p-4 rounded-lg border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : isCurrent
                    ? 'bg-blue-50 border-blue-200 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.id * 0.1 }}
              >
                {/* 步骤图标 */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  ) : (
                    <span className="text-white font-semibold">{step.id}</span>
                  )}
                </div>

                {/* 步骤内容 */}
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    isCompleted
                      ? 'text-green-800'
                      : isCurrent
                      ? 'text-blue-800'
                      : 'text-gray-600'
                  }`}>
                    {step.name}
                  </h3>
                  <p className={`text-sm ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {/* 状态指示器 */}
                <div className="flex-shrink-0">
                  {isCompleted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      完成
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      进行中
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      等待中
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">处理提示</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>请保持网络连接稳定</li>
                <li>生成过程中请不要关闭页面</li>
                <li>复杂内容可能需要更长时间</li>
                <li>生成完成后可以编辑和调整</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 取消按钮 */}
        <div className="mt-6 text-center">
          <button
            className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            onClick={() => {
              // TODO: 实现取消功能
              console.log('取消处理');
            }}
          >
            取消处理
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;