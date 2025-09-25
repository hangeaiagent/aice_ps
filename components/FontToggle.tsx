/**
 * 字体切换组件
 * 提供字体选择、大小调整、样式预览等功能
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fontService, type FontSettings, type FontConfig } from '../services/fontService';

interface FontToggleProps {
  currentSettings: FontSettings;
  onSettingsChange: (settings: FontSettings) => void;
  compact?: boolean;
}

const FontToggle: React.FC<FontToggleProps> = ({
  currentSettings,
  onSettingsChange,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableFonts, setAvailableFonts] = useState<FontConfig[]>([]);
  const [previewText, setPreviewText] = useState('这是一段示例文字，用于预览字体效果。');

  // 加载可用字体
  useEffect(() => {
    const fonts = fontService.getAccessibleFonts();
    setAvailableFonts(fonts);
  }, []);

  /**
   * 字体变更处理
   */
  const handleFontChange = useCallback((fontName: string) => {
    const newSettings = { ...currentSettings, fontFamily: fontName };
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  /**
   * 字体大小变更
   */
  const handleFontSizeChange = useCallback((fontSize: number) => {
    const newSettings = { ...currentSettings, fontSize };
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  /**
   * 字重变更
   */
  const handleFontWeightChange = useCallback((fontWeight: 'normal' | 'bold') => {
    const newSettings = { ...currentSettings, fontWeight };
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  /**
   * 行高变更
   */
  const handleLineHeightChange = useCallback((lineHeight: number) => {
    const newSettings = { ...currentSettings, lineHeight };
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  /**
   * 字母间距变更
   */
  const handleLetterSpacingChange = useCallback((letterSpacing: number) => {
    const newSettings = { ...currentSettings, letterSpacing };
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  /**
   * 快速预设
   */
  const applyPreset = useCallback((presetType: 'dyslexic' | 'child' | 'standard') => {
    const presetSettings = fontService.getRecommendedSettings(presetType);
    onSettingsChange(presetSettings);
  }, [onSettingsChange]);

  const currentFontConfig = availableFonts.find(font => font.name === currentSettings.fontFamily);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>{currentFontConfig?.displayName || '字体设置'}</span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              onBlur={() => setIsOpen(false)}
            >
              <div className="p-4">
                <FontSettingsPanel
                  currentSettings={currentSettings}
                  availableFonts={availableFonts}
                  previewText={previewText}
                  onFontChange={handleFontChange}
                  onFontSizeChange={handleFontSizeChange}
                  onFontWeightChange={handleFontWeightChange}
                  onLineHeightChange={handleLineHeightChange}
                  onLetterSpacingChange={handleLetterSpacingChange}
                  onApplyPreset={applyPreset}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">字体设置</h3>
      <FontSettingsPanel
        currentSettings={currentSettings}
        availableFonts={availableFonts}
        previewText={previewText}
        onFontChange={handleFontChange}
        onFontSizeChange={handleFontSizeChange}
        onFontWeightChange={handleFontWeightChange}
        onLineHeightChange={handleLineHeightChange}
        onLetterSpacingChange={handleLetterSpacingChange}
        onApplyPreset={applyPreset}
      />
    </div>
  );
};

interface FontSettingsPanelProps {
  currentSettings: FontSettings;
  availableFonts: FontConfig[];
  previewText: string;
  onFontChange: (fontName: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onFontWeightChange: (fontWeight: 'normal' | 'bold') => void;
  onLineHeightChange: (lineHeight: number) => void;
  onLetterSpacingChange: (letterSpacing: number) => void;
  onApplyPreset: (presetType: 'dyslexic' | 'child' | 'standard') => void;
}

const FontSettingsPanel: React.FC<FontSettingsPanelProps> = ({
  currentSettings,
  availableFonts,
  previewText,
  onFontChange,
  onFontSizeChange,
  onFontWeightChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onApplyPreset
}) => {
  return (
    <div className="space-y-6">
      {/* 快速预设 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          快速预设
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onApplyPreset('dyslexic')}
            className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            阅读障碍友好
          </button>
          <button
            onClick={() => onApplyPreset('child')}
            className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
          >
            儿童友好
          </button>
          <button
            onClick={() => onApplyPreset('standard')}
            className="px-3 py-2 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
          >
            标准设置
          </button>
        </div>
      </div>

      {/* 字体选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          字体选择
        </label>
        <div className="space-y-2">
          {availableFonts.map((font) => (
            <label key={font.name} className="flex items-center">
              <input
                type="radio"
                name="fontFamily"
                value={font.name}
                checked={currentSettings.fontFamily === font.name}
                onChange={(e) => onFontChange(e.target.value)}
                className="mr-2"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{font.displayName}</span>
                  {font.isAccessible && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      无障碍
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{font.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 字体大小 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          字体大小: {currentSettings.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="24"
          value={currentSettings.fontSize}
          onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>12px</span>
          <span>18px</span>
          <span>24px</span>
        </div>
      </div>

      {/* 字重 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          字重
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="fontWeight"
              value="normal"
              checked={currentSettings.fontWeight === 'normal'}
              onChange={(e) => onFontWeightChange(e.target.value as 'normal')}
              className="mr-2"
            />
            <span className="text-sm">正常</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="fontWeight"
              value="bold"
              checked={currentSettings.fontWeight === 'bold'}
              onChange={(e) => onFontWeightChange(e.target.value as 'bold')}
              className="mr-2"
            />
            <span className="text-sm font-bold">粗体</span>
          </label>
        </div>
      </div>

      {/* 行高 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          行高: {currentSettings.lineHeight}
        </label>
        <input
          type="range"
          min="1.2"
          max="2.0"
          step="0.1"
          value={currentSettings.lineHeight}
          onChange={(e) => onLineHeightChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>紧凑</span>
          <span>适中</span>
          <span>宽松</span>
        </div>
      </div>

      {/* 字母间距 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          字母间距: {currentSettings.letterSpacing}em
        </label>
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={currentSettings.letterSpacing}
          onChange={(e) => onLetterSpacingChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>紧密</span>
          <span>正常</span>
          <span>宽松</span>
        </div>
      </div>

      {/* 预览区域 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          效果预览
        </label>
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div
            className="text-gray-800"
            style={{
              fontFamily: fontService.getFontFamilyStack(currentSettings.fontFamily),
              fontSize: `${currentSettings.fontSize}px`,
              fontWeight: currentSettings.fontWeight,
              lineHeight: currentSettings.lineHeight,
              letterSpacing: `${currentSettings.letterSpacing}em`,
              wordSpacing: `${currentSettings.wordSpacing}em`
            }}
          >
            {previewText}
          </div>
        </div>
      </div>

      {/* 可访问性提示 */}
      {currentSettings.fontFamily === 'OpenDyslexic' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">OpenDyslexic 字体</p>
              <p>这种字体专为阅读障碍者设计，字母底部较重，有助于防止字母翻转和混淆。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FontToggle;