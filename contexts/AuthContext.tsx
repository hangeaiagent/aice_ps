import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!session;

  // 同步用户状态
  const syncUserState = (user: User | null, session: Session | null) => {
    setUser(user);
    setSession(session);
    console.log('[AuthContext] 用户状态更新:', { 
      userId: user?.id, 
      email: user?.email,
      hasSession: !!session
    });
  };

  // 初始化认证状态
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] 初始化认证状态...');
        
        // 获取当前会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] 获取会话失败:', error);
          setError(error.message);
        } else if (mounted) {
          syncUserState(session?.user ?? null, session);
        }
      } catch (error: any) {
        console.error('[AuthContext] 初始化失败:', error);
        if (mounted) {
          setError(error.message || '认证初始化失败');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] 认证状态变化:', event, session?.user?.email);
        
        if (mounted) {
          syncUserState(session?.user ?? null, session);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const clearError = () => setError(null);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('[AuthContext] 开始登录:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log('[AuthContext] ✅ 登录成功', { 
        userId: data.user?.id,
        email: data.user?.email 
      });
      
      // 状态会通过 onAuthStateChange 自动更新
    } catch (error: any) {
      console.error('[AuthContext] ❌ 登录失败', error);
      const message = getErrorMessage(error);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('[AuthContext] 开始注册:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log('[AuthContext] ✅ 注册成功', { 
        userId: data.user?.id,
        email: data.user?.email,
        needsConfirmation: !data.session
      });
      
      // 如果需要邮箱验证
      if (data.user && !data.session) {
        setError('注册成功！请检查您的邮箱并点击验证链接。');
      }
      
      // 状态会通过 onAuthStateChange 自动更新
    } catch (error: any) {
      console.error('[AuthContext] ❌ 注册失败', error);
      const message = getErrorMessage(error);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('[AuthContext] 开始登出');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      console.log('[AuthContext] ✅ 登出成功');
      
      // 状态会通过 onAuthStateChange 自动更新
    } catch (error: any) {
      console.error('[AuthContext] ❌ 登出失败', error);
      const message = getErrorMessage(error);
      setError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      console.log('[AuthContext] 开始重置密码:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      console.log('[AuthContext] ✅ 密码重置邮件已发送');
      setError('密码重置邮件已发送到您的邮箱，请查收。');
    } catch (error: any) {
      console.error('[AuthContext] ❌ 密码重置失败', error);
      const message = getErrorMessage(error);
      setError(message);
      throw new Error(message);
    }
  };

  // 错误消息处理
  const getErrorMessage = (error: AuthError | Error): string => {
    if (error.message.includes('Invalid login credentials')) {
      return '邮箱或密码错误，请检查后重试。';
    }
    if (error.message.includes('User already registered')) {
      return '该邮箱已被注册，请直接登录或使用其他邮箱。';
    }
    if (error.message.includes('Password should be at least')) {
      return '密码长度至少需要6位字符。';
    }
    if (error.message.includes('Unable to validate email address')) {
      return '邮箱格式不正确，请检查后重试。';
    }
    if (error.message.includes('Email not confirmed')) {
      return '请先验证您的邮箱，然后再尝试登录。';
    }
    return error.message || '发生未知错误，请稍后重试。';
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};