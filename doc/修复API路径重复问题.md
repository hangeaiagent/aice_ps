# 修复API路径重复问题

## 问题描述
前端请求API时出现路径重复问题：
- 错误路径：`/api/api/text-to-comic/deepseek/extract-scenes`
- 正确路径：`/api/text-to-comic/deepseek/extract-scenes`

## 问题原因
1. **Vite代理配置**：Vite配置了将 `/api` 路径代理到 `http://localhost:3002`
2. **apiBaseUrl设置错误**：代码中设置为 `http://localhost:3002`，导致直接请求后端，绕过了代理
3. **逻辑流程问题**：即使后端代理成功，代码仍继续执行，检查不存在的API Key

## 修复方案

### 1. 修改apiBaseUrl默认值
将所有API调用中的 `apiBaseUrl` 默认值从 `'http://localhost:3002'` 改为空字符串 `''`

**修改位置**：
- 第53行：OCR服务
- 第80行：Deepseek场景提取
- 第187行：Nanobanana图片生成

```typescript
// 修改前
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

// 修改后
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
```

### 2. 修复逻辑流程
添加响应状态检查，确保失败时抛出错误而不是继续执行

**Deepseek场景提取（第93-98行）**：
```typescript
// 修改前
if (response.ok) {
  const scenes = await response.json();
  return scenes;
}

// 修改后
if (response.ok) {
  const scenes = await response.json();
  return scenes;
} else {
  throw new Error(`场景提取失败: ${response.status} ${response.statusText}`);
}
```

**图片生成（第208-213行）**：
```typescript
// 修改前
if (response.ok) {
  const data = await response.json();
  return data.imageUrl || '';
}

// 修改后
if (response.ok) {
  const data = await response.json();
  return data.imageUrl || '';
} else {
  throw new Error(`图片生成失败: ${response.status} ${response.statusText}`);
}
```

### 3. 修正错误提示文案
将错误提示从"API未配置"改为"没有使用后端代理且API未配置"，更准确地反映实际情况

## 工作原理

### 开发环境
1. 前端运行在 `http://localhost:8889`
2. 前端请求 `/api/xxx` （相对路径）
3. Vite代理将请求转发到 `http://localhost:3002/api/xxx`
4. 后端处理请求并返回结果

### 生产环境
1. 前端和后端在同一域名下
2. Nginx统一处理路由
3. `/api` 路径直接转发到后端服务

## 测试验证

```bash
# 测试Deepseek API
curl -X POST http://localhost:8889/api/text-to-comic/deepseek/extract-scenes \
  -H "Content-Type: application/json" \
  -d '{"text": "测试文本"}'

# 测试图片生成API  
curl -X POST http://localhost:8889/api/text-to-comic/nanobanana/generate-comic \
  -H "Content-Type: application/json" \
  -d '{"description": "测试场景", "style": "cartoon"}'

# 测试OCR API
curl -X POST http://localhost:8889/api/text-to-comic/ocr/extract-text \
  -F "image=@test.jpg"
```

## 注意事项
1. 不要在开发环境直接请求后端端口（3002），应该通过前端代理
2. 环境变量 `VITE_API_BASE_URL` 通常不需要设置，除非有特殊需求
3. 所有API错误都应该正确抛出，不使用模拟数据
