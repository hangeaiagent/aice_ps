import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FontDemo: React.FC = () => {
  const [selectedFont, setSelectedFont] = useState('gradient');
  const demoText = "小明今天去公园玩。他看到了美丽的花朵，还遇到了一只可爱的小狗。小狗很友好，和小明一起玩耍。";

  const fontOptions = [
    {
      id: 'normal',
      name: '普通字体',
      description: '标准字体显示',
      component: (
        <p className="text-xl leading-relaxed">
          {demoText}
        </p>
      )
    },
    {
      id: 'dyslexic',
      name: 'OpenDyslexic字体',
      description: '专为阅读障碍设计的英文字体',
      component: (
        <p className="text-xl leading-relaxed font-dyslexic">
          {demoText}
        </p>
      )
    },
    {
      id: 'chinese-dyslexic',
      name: '中文友好字体',
      description: '优化的中文字体，增加字符间距',
      component: (
        <p className="text-xl leading-relaxed font-chinese-dyslexic">
          {demoText}
        </p>
      )
    },
    {
      id: 'gradient',
      name: '头轻脚重字体',
      description: '基于研究的渐变字重效果，减少字符旋转',
      component: (
        <GradientWeightText
          text={demoText}
          fontSize={20}
          className="text-gray-200"
        />
      )
    },
    {
      id: 'bottom-heavy',
      name: 'CSS头轻脚重',
      description: '使用CSS实现的头轻脚重效果',
      component: (
        <p 
          className="text-xl leading-relaxed font-bottom-heavy"
          data-text={demoText}
        >
          {demoText}
        </p>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-4">
            阅读障碍友好字体演示
          </h1>
          <p className="text-lg text-gray-400">
            选择最适合您的字体显示方式
          </p>
        </div>

        {/* 字体选择器 */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          {fontOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedFont(option.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedFont === option.id
                  ? 'border-orange-400 bg-orange-400/20'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <h3 className="font-medium text-white mb-2">{option.name}</h3>
              <p className="text-sm text-gray-400">{option.description}</p>
            </button>
          ))}
        </div>

        {/* 字体展示区域 */}
        <motion.div
          key={selectedFont}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-2">
              {fontOptions.find(f => f.id === selectedFont)?.name}
            </h2>
            <p className="text-gray-400">
              {fontOptions.find(f => f.id === selectedFont)?.description}
            </p>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600">
            {fontOptions.find(f => f.id === selectedFont)?.component}
          </div>

          {/* 技术说明 */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-lg font-medium text-blue-300 mb-2">技术原理</h3>
            <div className="text-sm text-blue-200">
              {selectedFont === 'gradient' && (
                <p>
                  使用多层文字叠加和CSS渐变遮罩，实现从上到下的字重渐变效果。
                  上部分使用较轻的字重（font-weight: 300），下部分使用较重的字重（font-weight: 600），
                  模拟"头轻脚重"的视觉效果，有助于减少阅读障碍者的字符旋转现象。
                </p>
              )}
              {selectedFont === 'bottom-heavy' && (
                <p>
                  使用CSS的::before和::after伪元素，结合linear-gradient背景遮罩，
                  在同一位置叠加不同字重的文字，通过渐变透明度实现头轻脚重效果。
                </p>
              )}
              {selectedFont === 'chinese-dyslexic' && (
                <p>
                  针对中文字符优化的字体设置，增加字符间距（letter-spacing: 0.08em）
                  和行高（line-height: 2.0），使用适合中文显示的字体族，提高可读性。
                </p>
              )}
              {selectedFont === 'dyslexic' && (
                <p>
                  OpenDyslexic是专门为阅读障碍者设计的字体，字符底部较重，
                  有助于防止字母在阅读时出现翻转或混淆现象。
                </p>
              )}
              {selectedFont === 'normal' && (
                <p>
                  标准字体显示，作为对比参考。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 使用建议 */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-lg font-medium text-green-300 mb-3">推荐使用</h3>
            <ul className="text-sm text-green-200 space-y-2">
              <li>• <strong>头轻脚重字体</strong>：适合有阅读障碍的中文用户</li>
              <li>• <strong>中文友好字体</strong>：适合需要更大字符间距的用户</li>
              <li>• <strong>OpenDyslexic字体</strong>：适合英文阅读障碍用户</li>
            </ul>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-medium text-blue-300 mb-3">研究基础</h3>
            <ul className="text-sm text-blue-200 space-y-2">
              <li>• 基于阅读障碍研究的字体设计原理</li>
              <li>• 头轻脚重效果减少字符旋转现象</li>
              <li>• 增加字符间距提高识别度</li>
              <li>• 渐变字重技术的创新应用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FontDemo;
