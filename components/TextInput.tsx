/**
 * 文本输入组件
 * 支持多行文本输入、字体预览、字数统计等功能
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fontService, type FontSettings } from '../services/fontService';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string, title?: string) => void;
  placeholder?: string;
  fontSettings: FontSettings;
  disabled?: boolean;
  maxLength?: number;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '请输入文字内容...',
  fontSettings,
  disabled = false,
  maxLength = 5000
}) => {
  const [title, setTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 更新字数统计和验证
  useEffect(() => {
    const count = value.trim().length;
    setWordCount(count);
    setIsValid(count >= 50 && count <= maxLength); // 最少50字，最多5000字
  }, [value, maxLength]);

  // 应用字体设置到文本框
  useEffect(() => {
    if (textareaRef.current) {
      fontService.applyFontToElement(textareaRef.current, fontSettings);
    }
  }, [fontSettings]);

  /**
   * 处理文本变更
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength]);

  /**
   * 处理提交
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !disabled) {
      onSubmit(value.trim(), title.trim() || undefined);
    }
  }, [isValid, disabled, value, title, onSubmit]);

  /**
   * 处理快捷键
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (isValid && !disabled) {
        onSubmit(value.trim(), title.trim() || undefined);
      }
    }
  }, [isValid, disabled, value, title, onSubmit]);

  /**
   * 清空内容
   */
  const handleClear = useCallback(() => {
    onChange('');
    setTitle('');
  }, [onChange]);

  /**
   * 粘贴示例文本
   */
  const handlePasteExample = useCallback(() => {
    const exampleText = `小明是一个好奇心很强的孩子。有一天，他在公园里发现了一只受伤的小鸟。小鸟的翅膀受了伤，无法飞翔。

小明小心翼翼地把小鸟带回家，请妈妈帮忙照顾。妈妈教小明如何给小鸟喂食和包扎伤口。

经过几天的精心照料，小鸟的伤口慢慢愈合了。当小鸟能够重新飞翔时，小明依依不舍地把它放回了大自然。

从那以后，小明更加热爱动物，也明白了保护环境的重要性。他经常和同学们一起参加环保活动，成为了一个小小环保卫士。`;
    
    onChange(exampleText);
    setTitle('小明和小鸟的故事');
  }, [onChange]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 标题输入 */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          故事标题（可选）
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="为您的故事起个名字..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={disabled}
          maxLength={100}
        />
      </div>

      {/* 文本输入区域 */}
      <div className="relative">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          文字内容 *
        </label>
        <textarea
          id="content"
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          disabled={disabled}
          maxLength={maxLength}
        />

        {/* 字数统计 */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
          {wordCount}/{maxLength}
        </div>
      </div>

      {/* 状态提示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {wordCount < 50 && wordCount > 0 && (
            <span className="text-sm text-amber-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              至少需要50个字符
            </span>
          )}
          
          {isValid && (
            <span className="text-sm text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              内容长度合适
            </span>
          )}

          {wordCount > maxLength * 0.9 && (
            <span className="text-sm text-amber-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              接近字数上限
            </span>
          )}
        </div>

        {/* 快捷操作按钮 */}
        <div className="flex items-center space-x-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              清空
            </button>
          )}
          
          <button
            type="button"
            onClick={handlePasteExample}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            试用示例
          </button>
        </div>
      </div>

      {/* 功能提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">使用提示：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>文本长度建议在50-2000字之间，便于生成精美漫画</li>
              <li>内容应包含明确的情节和对话，有助于AI理解</li>
              <li>使用Ctrl+Enter快捷键可快速提交</li>
              <li>支持故事、寓言、课文等各类文本内容</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <motion.button
        type="submit"
        disabled={!isValid || disabled}
        className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
          isValid && !disabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        whileTap={isValid && !disabled ? { scale: 0.98 } : {}}
      >
        {disabled ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            处理中...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            开始转换为漫画
          </div>
        )}
      </motion.button>

      {/* 键盘快捷键提示 */}
      <div className="text-xs text-gray-500 text-center">
        按 Ctrl+Enter 快速提交
      </div>
    </form>
  );
};

export default TextInput;