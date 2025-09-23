import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { SparkleIcon, EyeIcon, EyeSlashIcon } from './icons';

interface ResetPasswordPageProps {
  onComplete: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查是否有有效的重置密码会话
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('获取会话失败:', error);
          setError('无效的重置密码链接，请重新申请密码重置。');
          setIsValidSession(false);
          return;
        }

        // 检查是否是密码重置会话
        if (session && session.user) {
          setIsValidSession(true);
        } else {
          setError('无效的重置密码链接，请重新申请密码重置。');
          setIsValidSession(false);
        }
      } catch (error) {
        console.error('检查会话失败:', error);
        setError('检查重置密码状态失败，请重新申请密码重置。');
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 表单验证
    if (!password.trim()) {
      setError('请输入新密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      // 3秒后跳转到主页
      setTimeout(() => {
        onComplete();
      }, 3000);

    } catch (error: any) {
      console.error('密码重置失败:', error);
      
      let errorMessage = '密码重置失败，请重试';
      
      if (error.message?.includes('session_not_found')) {
        errorMessage = '重置密码链接已过期，请重新申请密码重置';
      } else if (error.message?.includes('invalid_credentials')) {
        errorMessage = '无效的重置密码请求，请重新申请';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 如果还在检查会话状态
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-500/10 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">正在验证重置密码链接...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果会话无效
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-red-500/10 p-8"
        >
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">链接无效</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              返回主页
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 成功页面
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-green-500/10 p-8"
        >
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 text-2xl">✅</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">密码重置成功</h2>
            <p className="text-gray-400 mb-6">
              您的密码已成功重置，即将跳转到主页...
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 重置密码表单
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <SparkleIcon className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">设置新密码</h2>
            <p className="text-gray-400">请输入您的新密码</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg text-sm bg-red-500/20 border border-red-500/50 text-red-300"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 新密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                新密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 pr-12"
                  placeholder="请输入新密码（至少6位）"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 确认密码输入 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                确认新密码
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 pr-12"
                  placeholder="请再次输入新密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 密码强度提示 */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>密码要求：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li className={password.length >= 6 ? 'text-green-400' : 'text-gray-400'}>
                  至少6个字符
                </li>
                <li className={password === confirmPassword && password.length > 0 ? 'text-green-400' : 'text-gray-400'}>
                  两次输入密码一致
                </li>
              </ul>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  重置中...
                </>
              ) : (
                '重置密码'
              )}
            </button>

            {/* 返回链接 */}
            <div className="text-center">
              <button
                type="button"
                onClick={onComplete}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                返回主页
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
