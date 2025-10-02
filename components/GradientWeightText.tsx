import React from 'react';

interface GradientWeightTextProps {
  text: string;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

const GradientWeightText: React.FC<GradientWeightTextProps> = ({
  text,
  fontSize = 20,
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: '1.8',
        letterSpacing: '0.05em',
        ...style
      }}
    >
      {/* 底层：粗体文字（脚重） */}
      <div
        className="absolute inset-0"
        style={{
          fontWeight: '600',
          background: 'linear-gradient(to bottom, transparent 0%, transparent 40%, currentColor 60%, currentColor 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "OpenDyslexic", sans-serif'
        }}
      >
        {text}
      </div>
      
      {/* 中层：正常字重 */}
      <div
        className="absolute inset-0"
        style={{
          fontWeight: '400',
          background: 'linear-gradient(to bottom, transparent 0%, currentColor 20%, currentColor 80%, transparent 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "OpenDyslexic", sans-serif'
        }}
      >
        {text}
      </div>
      
      {/* 顶层：细体文字（头轻） */}
      <div
        className="relative"
        style={{
          fontWeight: '300',
          background: 'linear-gradient(to bottom, currentColor 0%, currentColor 40%, transparent 60%, transparent 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "OpenDyslexic", sans-serif'
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default GradientWeightText;
