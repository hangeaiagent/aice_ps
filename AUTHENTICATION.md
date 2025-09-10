# AicePS 会员认证系统

## 📋 功能概述

AicePS 现已集成完整的会员登录注册系统，基于 Supabase Auth 提供安全可靠的用户认证服务。

## 🚀 主要功能

### 用户认证
- ✅ **邮箱密码登录** - 支持传统邮箱密码认证
- ✅ **用户注册** - 新用户可以快速创建账户
- ✅ **密码重置** - 忘记密码时可通过邮箱重置
- ✅ **会话持久化** - 登录状态自动保持
- ✅ **安全登出** - 一键安全退出账户

### 界面特性
- 🎨 **艺术化设计** - 与项目整体风格保持一致的精美界面
- 📱 **响应式布局** - 完美适配桌面和移动设备
- ⚡ **流畅动画** - 使用 Framer Motion 提供丝滑的交互体验
- 🌙 **深色主题** - 符合现代设计趋势的深色界面
- 💫 **渐变效果** - 精心设计的渐变色彩和光影效果

### 用户体验
- 🔄 **实时状态** - 登录状态实时更新，无需刷新页面
- 🎯 **智能提示** - 友好的错误提示和成功反馈
- 🚫 **表单验证** - 前端实时验证，提升用户体验
- 🔒 **安全性** - 基于 Supabase 的企业级安全保障

## 🛠️ 技术实现

### 核心技术栈
- **Supabase Auth** - 认证服务提供商
- **React Context** - 全局状态管理
- **TypeScript** - 类型安全保障
- **Framer Motion** - 动画效果库
- **Tailwind CSS** - 样式框架

### 项目结构
```
/workspace
├── .env                          # 环境变量配置
├── contexts/
│   └── AuthContext.tsx          # 认证上下文
├── components/
│   ├── Auth.tsx                 # 登录注册表单
│   ├── AuthModal.tsx            # 认证模态框
│   └── UserMenu.tsx             # 用户菜单
├── lib/
│   └── supabase.ts              # Supabase 客户端配置
├── types/
│   └── supabase.ts              # 数据库类型定义
└── database/
    └── init.sql                 # 数据库初始化脚本
```

## ⚙️ 配置说明

### 环境变量
项目根目录的 `.env` 文件包含以下配置：
```bash
# Supabase 配置
VITE_SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 数据库配置
SUPABASE_DB_URL=https://uobwbhvwrciaxloqdizc.supabase.co

# 开发环境配置
PORT=8889
```

### Supabase 配置
- **URL**: `https://uobwbhvwrciaxloqdizc.supabase.co`
- **匿名密钥**: 已配置在环境变量中
- **认证流程**: 使用 PKCE 流程增强安全性
- **会话持久化**: 启用自动会话保持

## 🎯 使用方法

### 1. 启动项目
```bash
# 安装依赖
npm install

# 启动开发服务器（固定端口 8889）
npx netlify dev --port 8889
```

### 2. 用户操作流程

#### 新用户注册
1. 点击页面右上角的「登录」按钮
2. 在弹出的认证窗口中点击「立即注册」
3. 输入邮箱地址和密码（至少6位）
4. 确认密码并点击「注册」按钮
5. 根据配置，可能需要邮箱验证

#### 用户登录
1. 点击页面右上角的「登录」按钮
2. 输入已注册的邮箱和密码
3. 点击「登录」按钮
4. 登录成功后会显示用户头像和菜单

#### 密码重置
1. 在登录界面点击「忘记密码？」
2. 输入注册时使用的邮箱地址
3. 点击「发送重置链接」
4. 检查邮箱并按照指引重置密码

#### 用户菜单
登录后点击右上角的用户头像可以：
- 查看个人资料
- 访问账户设置
- 安全登出

## 🔧 开发指南

### 在组件中使用认证状态
```tsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  
  if (isLoading) {
    return <div>加载中...</div>;
  }
  
  if (isAuthenticated) {
    return (
      <div>
        <p>欢迎，{user?.email}</p>
        <button onClick={signOut}>登出</button>
      </div>
    );
  }
  
  return <div>请先登录</div>;
};
```

### 保护需要登录的功能
```tsx
import { useAuth } from '../contexts/AuthContext';

const ProtectedFeature = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>此功能需要登录后使用</div>;
  }
  
  return <div>受保护的功能内容</div>;
};
```

## 🗄️ 数据库结构

### 用户配置表 (user_profiles)
```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY,              -- 用户ID
    email TEXT UNIQUE NOT NULL,       -- 邮箱地址
    display_name TEXT,                -- 显示名称
    avatar_url TEXT,                  -- 头像URL
    provider TEXT DEFAULT 'email',    -- 认证提供商
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE,
    preferences JSON DEFAULT '{}'     -- 用户偏好设置
);
```

### 用户项目表 (user_projects)
```sql
CREATE TABLE public.user_projects (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_data JSON DEFAULT '{}',
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 安全特性

### 行级安全策略 (RLS)
- 启用了 Supabase 的行级安全策略
- 用户只能访问自己的数据
- 自动同步 Auth 用户信息

### 前端安全
- JWT 令牌自动管理
- PKCE 流程防止授权码拦截
- 安全的会话存储

### 数据验证
- 前后端双重验证
- 邮箱格式验证
- 密码强度检查

## 🚨 故障排除

### 常见问题

#### 1. 登录失败
- 检查邮箱和密码是否正确
- 确认邮箱是否已验证
- 查看浏览器控制台的错误信息

#### 2. 注册问题
- 确保密码至少6位字符
- 检查邮箱格式是否正确
- 查看是否需要邮箱验证

#### 3. 环境配置
- 确认 `.env` 文件存在且配置正确
- 检查 Supabase URL 和密钥是否有效
- 重启开发服务器使环境变量生效

### 调试技巧
1. 打开浏览器开发者工具
2. 查看 Console 标签页的日志信息
3. 检查 Network 标签页的网络请求
4. 查看 Application > Local Storage 中的认证数据

## 🎨 样式定制

### 主要 CSS 类
- `.auth-form` - 认证表单容器
- `.auth-input` - 输入框样式
- `.auth-button` - 按钮样式
- `.message-error` - 错误消息
- `.message-success` - 成功消息

### 自定义主题
可以通过修改 `index.css` 中的 CSS 变量来自定义主题：
```css
:root {
  --auth-primary: #3b82f6;
  --auth-secondary: #1d4ed8;
  --auth-background: rgba(31, 41, 55, 0.8);
}
```

## 📈 未来扩展

### 计划功能
- [ ] 社交登录（Google、GitHub）
- [ ] 多因素认证 (2FA)
- [ ] 用户资料管理
- [ ] 项目云端同步
- [ ] 使用统计分析

### API 集成
- [ ] 用户偏好设置 API
- [ ] 项目管理 API
- [ ] 文件上传 API
- [ ] 使用统计 API

## 📞 技术支持

如果在使用过程中遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查浏览器控制台的错误信息
3. 确认 Supabase 服务状态
4. 联系技术团队获取支持

---

**版本**: v1.0  
**最后更新**: 2025年09月10日  
**维护团队**: AicePS 开发团队