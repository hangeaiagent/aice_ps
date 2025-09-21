import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  XMarkIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
  isGenerating?: boolean;
  generatedImage?: string;
  professionalPrompt?: string;
}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatDialog: React.FC<ChatDialogProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理图片上传
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传有效的图片文件 (PNG, JPEG, WEBP)');
      return;
    }

    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片文件不能超过10MB');
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 清除上传的图片
  const clearUploadedImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputText.trim() && !uploadedImage) return;
    if (!isAuthenticated) {
      const event = new CustomEvent('openAuthModal');
      window.dispatchEvent(event);
      return;
    }

    const messageId = Date.now().toString();
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: inputText.trim(),
      image: uploadedImagePreview || undefined,
      timestamp: new Date()
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);

    // 如果有图片和提示词，开始生成
    if (uploadedImage && inputText.trim()) {
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        type: 'assistant',
        content: '🔍 正在分析您的图片...\n📝 生成专业提示词...\n🎨 开始定制化生成...',
        timestamp: new Date(),
        isGenerating: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsGenerating(true);

      try {
        // 调用自定义图片生成API
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('prompt', inputText.trim());

        const response = await fetch('/api/custom-image-generation', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          // 更新助手消息
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? {
                  ...msg,
                  content: `✅ 已根据您的需求"${inputText.trim()}"成功生成定制化图片！\n\n🤖 **AI分析结果：**\n${result.professional_prompt.substring(0, 200)}${result.professional_prompt.length > 200 ? '...' : ''}\n\n⏱️ 处理时间：${result.processing_time?.toFixed(2)}秒`,
                  generatedImage: result.custom_image_url,
                  professionalPrompt: result.professional_prompt,
                  isGenerating: false
                }
              : msg
          ));
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? {
                  ...msg,
                  content: `❌ 生成失败：${result.message || '未知错误'}\n\n💡 请尝试：\n• 使用更清晰的图片\n• 提供更具体的描述\n• 检查网络连接`,
                  isGenerating: false
                }
              : msg
          ));
        }
      } catch (error) {
        console.error('生成失败:', error);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? {
                ...msg,
                content: '❌ 生成过程中出现网络错误，请稍后重试。',
                isGenerating: false
              }
            : msg
        ));
      } finally {
        setIsGenerating(false);
      }
    } else if (!uploadedImage && inputText.trim()) {
      // 纯文本消息的智能回复
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `您好！我是AI图片定制助手 🎨\n\n请上传一张人物照片并描述您想要的效果，我将为您生成专业的定制化结果。\n\n🌟 **支持的定制类型：**\n• 职业形象：医生、律师、教师等\n• 风格转换：古装、现代、科幻等\n• 场景变换：不同背景和环境\n• 服装搭配：各种服装和配饰\n• 年龄调整：年轻化或成熟化\n\n💡 **示例提示词：**\n"让我看起来像一个专业的医生，穿白大褂，在医院环境中"\n"把我变成古代武士，穿着传统盔甲，在古代战场上"`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }

    // 清空输入
    setInputText('');
    clearUploadedImage();
  };

  // 下载生成的图片
  const downloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-custom-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试');
    }
  };

  // 重新生成图片
  const regenerateImage = async (messageId: string, originalPrompt: string, originalImage: string) => {
    try {
      const response = await fetch(originalImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });

      // 更新消息状态为生成中
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '🔄 正在重新生成...', isGenerating: true }
          : msg
      ));

      setIsGenerating(true);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('prompt', originalPrompt);

      const apiResponse = await fetch('/api/custom-image-generation', {
        method: 'POST',
        body: formData
      });

      const result = await apiResponse.json();

      if (result.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                content: `✅ 已重新生成定制化图片！\n\n🤖 **AI分析结果：**\n${result.professional_prompt.substring(0, 200)}${result.professional_prompt.length > 200 ? '...' : ''}\n\n⏱️ 处理时间：${result.processing_time?.toFixed(2)}秒`,
                generatedImage: result.custom_image_url,
                professionalPrompt: result.professional_prompt,
                isGenerating: false
              }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                content: `❌ 重新生成失败：${result.message || '未知错误'}`,
                isGenerating: false
              }
            : msg
        ));
      }
    } catch (error) {
      console.error('重新生成失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              content: '❌ 重新生成失败，请稍后重试。',
              isGenerating: false
            }
          : msg
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI图片定制助手</h2>
              <p className="text-sm text-gray-400">基于Gemini 2.5 Flash的专业图片定制</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhotoIcon className="w-8 h-8" />
              </div>
              <p className="text-xl mb-2">开始您的AI图片定制之旅</p>
              <p className="text-sm max-w-md mx-auto">上传一张人物照片，描述您想要的效果，我将为您生成专业的定制化结果</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-4 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                }`}
              >
                {message.image && (
                  <div className="mb-3">
                    <img
                      src={message.image}
                      alt="上传的图片"
                      className="w-full max-w-sm rounded-lg shadow-lg"
                    />
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.generatedImage && (
                  <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                    <img
                      src={message.generatedImage}
                      alt="生成的图片"
                      className="w-full max-w-sm rounded-lg shadow-lg mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImage(message.generatedImage!)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        下载图片
                      </button>
                      <button
                        onClick={() => {
                          const userMessage = messages.find(m => 
                            messages.indexOf(m) === messages.indexOf(message) - 1
                          );
                          if (userMessage && userMessage.image) {
                            regenerateImage(message.id, userMessage.content, userMessage.image);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                        disabled={message.isGenerating}
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        重新生成
                      </button>
                    </div>
                  </div>
                )}

                {message.isGenerating && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-gray-900/30 rounded-lg">
                    <Spinner size="small" />
                    <span className="text-sm text-gray-300">AI正在处理中...</span>
                  </div>
                )}

                <div className="text-xs opacity-60 mt-3">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-700 p-6">
          {uploadedImagePreview && (
            <div className="mb-4 relative inline-block">
              <img
                src={uploadedImagePreview}
                alt="预览"
                className="w-24 h-24 object-cover rounded-lg shadow-lg"
              />
              <button
                onClick={clearUploadedImage}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-gray-700"
              disabled={isGenerating}
              title="上传图片"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              className="hidden"
            />

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="描述您想要的图片效果，例如：让我看起来像一个专业的医生..."
              className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-400"
              disabled={isGenerating}
            />

            <button
              onClick={sendMessage}
              disabled={(!inputText.trim() && !uploadedImage) || isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              {isGenerating ? (
                <Spinner size="small" />
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 支持PNG、JPEG、WEBP格式，最大10MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatDialog;
