import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 环境变量未正确配置');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      flowType: 'pkce',              // 使用PKCE流程增强安全性
      persistSession: true,          // 持久化会话
      autoRefreshToken: true,        // 自动刷新令牌
      detectSessionInUrl: true,      // 自动检测URL中的会话参数
      storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      }
    }
  }
);