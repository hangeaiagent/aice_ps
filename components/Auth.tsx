import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { SparkleIcon } from './icons';

interface AuthProps {
  onClose?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const { signIn, signUp, resetPassword, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email.trim() || !password.trim()) {
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      return;
    }

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        // 登录成功后清空表单并关闭窗口
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        if (onClose) {
          onClose();
        }
      } else {
        const result = await signUp(email.trim(), password);
        // 注册成功后，检查是否需要邮箱验证
        if (result.needsVerification) {
          // 显示邮箱验证界面
          setRegisteredEmail(email.trim());
          setShowEmailVerification(true);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        } else {
          // 如果不需要验证，直接关闭窗口
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          if (onClose) {
            onClose();
          }
        }
      }
    } catch (error) {
      // 错误已在 AuthContext 中处理
      console.error('认证失败:', error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email.trim()) {
      return;
    }

    try {
      await resetPassword(email.trim());
      setShowForgotPassword(false);
    } catch (error) {
      console.error('密码重置失败:', error);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  // 邮箱验证等待界面
  if (showEmailVerification) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-green-500/10 overflow-hidden"
      >
        {/* 成功状态头部装饰 */}
        <div className="relative h-24 bg-gradient-to-r from-green-600/20 to-blue-600/20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-800/80"></div>
          <div className="absolute top-4 left-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 bg-gray-800/90 rounded-full border-2 border-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-8 pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">注册成功！</h2>
            <p className="text-gray-400 mb-4">
              验证邮件已发送至
            </p>
            <p className="text-green-400 font-medium text-lg mb-4">
              {registeredEmail}
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              请检查您的邮箱（包括垃圾邮件文件夹），点击验证链接完成账户激活。
              验证后即可开始使用 Aice PS 的所有功能。
            </p>
          </div>

          {/* 操作提示 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">接下来该做什么？</p>
                <ul className="space-y-1 text-blue-200">
                  <li>• 打开您的邮箱应用</li>
                  <li>• 查找来自 Aice PS 的验证邮件</li>
                  <li>• 点击邮件中的"验证账户"按钮</li>
                  <li>• 返回网站开始创作</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowEmailVerification(false);
                setRegisteredEmail('');
                clearError();
                if (onClose) {
                  onClose();
                }
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              我知道了，关闭窗口
            </button>
            
            <button
              onClick={() => {
                setShowEmailVerification(false);
                setRegisteredEmail('');
                clearError();
                setIsLogin(true);
              }}
              className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors duration-200"
            >
              返回登录页面
            </button>
          </div>

          {/* 帮助信息 */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-center text-gray-400 text-xs">
              没有收到邮件？请检查垃圾邮件文件夹，或
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setRegisteredEmail('');
                  clearError();
                  setIsLogin(false);
                }}
                className="ml-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                重新注册
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (showForgotPassword) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <SparkleIcon className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">重置密码</h2>
            <p className="text-gray-400">输入您的邮箱地址，我们将发送重置链接</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-lg text-sm ${
                error.includes('已发送') 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-red-500/20 border border-red-500/50 text-red-300'
              }`}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-2">
                邮箱地址
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="输入您的邮箱地址"
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                返回
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? '发送中...' : '发送重置链接'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden"
    >
      {/* 头部装饰 */}
      <div className="relative h-24 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-800/80"></div>
        <div className="absolute top-4 left-4">
          <SparkleIcon className="w-8 h-8 text-blue-400" />
        </div>
        <div className="absolute top-4 right-4">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600/50 rounded-full flex items-center justify-center transition-colors duration-200 group"
              title="关闭"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-16 h-16 bg-gray-800/90 rounded-full border-2 border-gray-600 flex items-center justify-center">
            <SparkleIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="p-8 pt-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? '欢迎回来' : '创建账户'}
          </h2>
          <p className="text-gray-400">
            {isLogin ? '登录您的 Aice PS 账户' : '加入 Aice PS 创作社区'}
          </p>
          {!isLogin && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300 text-center">
                注册后您将获得邮箱验证链接，验证完成即可开始使用所有功能
              </p>
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-3 rounded-lg text-sm ${
              error.includes('成功') || error.includes('已发送')
                ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                : 'bg-red-500/20 border border-red-500/50 text-red-300'
            }`}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="输入您的邮箱地址"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder={isLogin ? '输入您的密码' : '创建一个安全的密码'}
              required
              minLength={6}
              disabled={isLoading}
            />
            {!isLogin && password && password.length < 6 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-sm text-yellow-400"
              >
                密码至少需要6个字符
              </motion.p>
            )}
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="再次输入密码"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                {!isLogin && password && confirmPassword && password !== confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-sm text-red-400"
                  >
                    密码不匹配
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isLogin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                disabled={isLoading}
              >
                忘记密码？
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={
              isLoading || 
              !email.trim() || 
              !password.trim() || 
              (!isLogin && password !== confirmPassword)
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                {isLogin ? '登录中...' : '注册中...'}
              </div>
            ) : (
              isLogin ? '登录' : '注册'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-center text-gray-400 text-sm">
            {isLogin ? '还没有账户？' : '已经有账户了？'}
            <button
              onClick={switchMode}
              className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              disabled={isLoading}
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;