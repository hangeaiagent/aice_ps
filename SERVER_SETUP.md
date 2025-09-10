# AicePS 服务器端图片生成设置指南

## 概述

本指南将帮助您设置 AicePS 的服务器端图片生成功能。服务器端生成具有以下优势：

- **更好的性能**: 服务器后台处理，支持并发生成
- **文件管理**: 图片保存到本地目录或云存储
- **资源优化**: 减轻前端负担，提升用户体验
- **扩展性**: 支持批量处理和队列管理

## 快速开始

### 1. 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- Gemini API Key

### 2. 安装和配置

#### 方法一：使用启动脚本（推荐）

```bash
# 启动完整开发环境（前端 + 后端）
./start-dev.sh

# 或者只启动后端服务器
./start-server.sh
```

#### 方法二：手动安装

```bash
# 1. 安装后端依赖
cd server
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置您的 API 密钥

# 3. 启动服务器
npm start
```

### 3. 环境变量配置

#### 后端配置 (`server/.env`)

```bash
# 服务器配置
PORT=3001
BASE_URL=http://localhost:3001

# Gemini API 配置
GEMINI_API_KEY=your_gemini_api_key_here

# 存储配置
STORAGE_TYPE=local  # 'local' 或 'aws'

# AWS S3 配置 (仅当 STORAGE_TYPE=aws 时需要)
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=your-bucket-name
```

#### 前端配置 (`.env`)

```bash
# Gemini API 配置
GEMINI_API_KEY=

# 服务器生成配置
VITE_USE_SERVER_GENERATION=false
VITE_API_BASE_URL=http://localhost:3001/api

# 开发环境配置
VITE_DEV_MODE=true
```

## 存储配置

### 本地存储（默认）

图片将保存在 `server/uploads/` 目录中，通过 HTTP 服务提供访问。

```bash
STORAGE_TYPE=local
```

### AWS S3 存储

配置 AWS S3 存储以获得更好的扩展性和可靠性：

```bash
STORAGE_TYPE=aws
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**AWS S3 设置步骤：**

1. 创建 S3 存储桶
2. 创建 IAM 用户并获取访问密钥
3. 为 IAM 用户分配 S3 权限
4. 配置存储桶的公共读取权限（用于图片访问）

## API 接口

### 健康检查
```
GET /health
```

### 文本生成图片
```
POST /api/generate-image
Content-Type: application/json

{
  "prompt": "图片描述",
  "aspectRatio": "1:1"
}
```

### 图片编辑
```
POST /api/edit-image
Content-Type: multipart/form-data

- image: File
- prompt: String
- type: String (edit|filter|style|adjustment|texture|remove-background|fusion|decade)
- hotspot: String (JSON, 仅用于 edit 类型)
```

### 批量图片生成
```
POST /api/generate-batch-images
Content-Type: multipart/form-data

- image: File
- prompts: String (JSON 数组)
```

### 创意建议
```
POST /api/creative-suggestions
Content-Type: multipart/form-data

- image: File
- type: String (filter|adjustment|texture)
```

## 前端集成

### 设置服务器生成模式

1. 打开应用设置
2. 选择"图片生成方式"为"服务器生成（后台处理）"
3. 保存设置

### 混合模式

应用支持混合模式，会自动在服务器生成和前端生成之间切换：

- 优先使用服务器生成
- 服务器不可用时自动回退到前端生成
- 用户可以在设置中手动选择生成方式

## 部署

### 开发环境

```bash
# 启动开发环境
./start-dev.sh

# 或分别启动
npm run dev          # 前端 (端口 5173)
cd server && npm start  # 后端 (端口 3001)
```

### 生产环境

```bash
# 1. 构建前端
npm run build

# 2. 配置生产环境变量
# 编辑 server/.env
PORT=3001
BASE_URL=https://your-domain.com
STORAGE_TYPE=aws
# ... 其他生产环境配置

# 3. 启动服务器
cd server
npm start
```

### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
cd server
pm2 start server.js --name "aiceps-server"

# 查看状态
pm2 status

# 查看日志
pm2 logs aiceps-server
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用进程
   lsof -i :3001
   
   # 终止进程
   kill -9 <PID>
   ```

2. **API 密钥错误**
   - 检查 `server/.env` 中的 `GEMINI_API_KEY`
   - 确保 API 密钥有效且有足够的配额

3. **文件上传失败**
   - 检查 `server/uploads` 目录权限
   - 确保磁盘空间充足

4. **AWS S3 配置错误**
   - 验证 AWS 访问密钥
   - 检查 S3 存储桶权限
   - 确认存储桶区域设置

### 日志和调试

服务器会输出详细的日志信息，包括：
- API 请求和响应
- 图片生成状态
- 错误信息和堆栈跟踪

## 性能优化

### 并发控制

服务器默认支持并发图片生成，可以通过修改代码调整并发数量：

```javascript
// server/services/imageService.js
const concurrency = 3; // 调整并发数量
```

### 缓存策略

考虑实现以下缓存策略：
- 图片缓存（避免重复生成相同内容）
- API 响应缓存
- CDN 加速（用于图片访问）

### 监控和告警

建议设置监控和告警：
- 服务器健康状态
- API 响应时间
- 错误率统计
- 存储空间使用情况

## 安全考虑

1. **API 密钥保护**
   - 不要在前端暴露 API 密钥
   - 使用环境变量存储敏感信息

2. **文件上传安全**
   - 限制上传文件类型和大小
   - 验证文件内容

3. **访问控制**
   - 实现用户认证和授权
   - 限制 API 调用频率

4. **HTTPS**
   - 生产环境使用 HTTPS
   - 配置 SSL 证书

## 更新和维护

### 更新依赖

```bash
# 更新服务器依赖
cd server
npm update

# 更新前端依赖
npm update
```

### 备份

定期备份：
- 环境配置文件
- 生成的图片文件
- 数据库（如果使用）

### 监控

使用工具监控：
- 服务器性能
- 磁盘使用情况
- API 调用统计
- 错误日志

## 支持

如果您遇到问题或需要帮助，请：

1. 查看日志文件获取错误信息
2. 检查配置文件是否正确
3. 参考本文档的故障排除部分
4. 联系技术支持