import React, { useEffect, useRef } from 'react';

interface DyslexiaFriendlyTextProps {
  text: string;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DyslexiaFriendlyText: React.FC<DyslexiaFriendlyTextProps> = ({
  text,
  fontSize = 20,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const textWidth = text.length * fontSize * 0.8; // 估算文字宽度
    const textHeight = fontSize * 1.5; // 文字高度
    canvas.width = textWidth;
    canvas.height = textHeight;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 创建三个不同字重的文字图像数据
    const createTextImageData = (fontWeight: string) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      tempCtx.font = `${fontWeight} ${fontSize}px "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif`;
      tempCtx.fillStyle = '#ffffff';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(text, 0, canvas.height / 2);
      
      return tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    };

    const lightData = createTextImageData('300');
    const normalData = createTextImageData('400');
    const boldData = createTextImageData('600');

    // 创建渐变权重的文字
    const outputData = ctx.createImageData(canvas.width, canvas.height);
    const centerY = canvas.height / 2;

    for (let y = 0; y < canvas.height; y++) {
      // 计算当前行的权重比例
      const distanceFromCenter = Math.abs(y - centerY);
      const maxDistance = canvas.height / 2;
      
      // 上半部分：从light到normal
      // 下半部分：从normal到bold
      let lightRatio = 0;
      let normalRatio = 0;
      let boldRatio = 0;

      if (y < centerY) {
        // 上半部分：头轻效果
        const ratio = distanceFromCenter / maxDistance;
        lightRatio = ratio * 0.7; // 上部更轻
        normalRatio = 1 - ratio;
        boldRatio = 0;
      } else {
        // 下半部分：脚重效果
        const ratio = distanceFromCenter / maxDistance;
        lightRatio = 0;
        normalRatio = 1 - ratio;
        boldRatio = ratio * 0.8; // 下部更重
      }

      for (let x = 0; x < canvas.width; x++) {
        const pixelIndex = (y * canvas.width + x) * 4;
        
        // 混合三种字重的alpha值
        const lightAlpha = lightData.data[pixelIndex + 3];
        const normalAlpha = normalData.data[pixelIndex + 3];
        const boldAlpha = boldData.data[pixelIndex + 3];
        
        const finalAlpha = lightAlpha * lightRatio + normalAlpha * normalRatio + boldAlpha * boldRatio;
        
        // 设置像素值
        outputData.data[pixelIndex] = 255; // R
        outputData.data[pixelIndex + 1] = 255; // G
        outputData.data[pixelIndex + 2] = 255; // B
        outputData.data[pixelIndex + 3] = finalAlpha; // A
      }
    }

    ctx.putImageData(outputData, 0, 0);
  }, [text, fontSize]);

  return (
    <div className={className} style={style}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
};

export default DyslexiaFriendlyText;
