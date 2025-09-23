# AWS S3 配置指南

## 🔧 环境变量配置

为了使图片能够正确上传到AWS S3，需要配置以下环境变量。

### 1. 创建 .env 文件

在项目根目录创建 `.env` 文件（如果不存在），并添加以下配置：

```bash
# ===========================================
# Gemini API 配置
# ===========================================
GEMINI_API_KEY=your_gemini_api_key_here

# ===========================================
# AWS S3 存储配置
# ===========================================
# AWS访问密钥ID
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here

# AWS访问密钥
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here

# AWS区域
AWS_REGION=us-east-1

# S3存储桶名称（统一使用AWS_S3_BUCKET）
AWS_S3_BUCKET=spotgitagent

# 存储类型：local（本地存储）或 aws（AWS S3存储）
STORAGE_TYPE=aws

# ===========================================
# Supabase 数据库配置（可选）
# ===========================================
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 2. 获取AWS凭证

#### 方法一：从AWS控制台获取
1. 登录 [AWS控制台](https://console.aws.amazon.com/)
2. 进入 IAM 服务
3. 创建新用户或使用现有用户
4. 为用户分配S3权限
5. 生成访问密钥

#### 方法二：使用现有凭证
如果您已经配置了AWS CLI，可以从以下位置获取凭证：
- macOS/Linux: `~/.aws/credentials`
- Windows: `C:\Users\用户名\.aws\credentials`

### 3. S3存储桶配置

确保S3存储桶 `spotgitagent` 存在且具有以下权限：
- 允许上传文件
- 允许公开读取（用于生成公开访问URL）

### 4. 验证配置

运行以下命令验证配置是否正确：

```bash
# 测试图片生成和S3上传
python3 backend/enhanced_image_generator.py --image test_simple.jpg --prompt "测试S3上传" --user-id test-user
```

## 🔍 修改内容说明

### 主要改进

1. **S3上传不再依赖数据库任务记录**
   - 即使数据库未配置，S3上传仍然可以正常工作
   - 使用时间戳和唯一ID生成文件名

2. **统一环境变量名称**
   - 使用 `AWS_S3_BUCKET` 替代 `S3_BUCKET_NAME`
   - 与其他服务保持一致

3. **增强日志记录**
   - 详细记录S3上传过程
   - 包含文件大小、上传时间、上传速度等信息
   - 清晰的步骤分隔和状态提示

4. **改进错误处理**
   - 更详细的错误信息
   - 配置检查和提示
   - 优雅的降级处理

### 文件结构

修改后的S3文件结构：

```
S3存储桶/
├── original-images/          # 原始图片（无任务记录时）
│   └── 20250922_143000_abc12345_original.jpg
├── generated-images/         # 生成图片（无任务记录时）
│   └── 20250922_143000_abc12345_generated.jpg
└── task-history/            # 任务记录图片（有任务记录时）
    └── user_id/
        └── task_id/
            ├── original.jpg
            └── generated.jpg
```

## 🧪 测试步骤

1. **配置环境变量**：按照上述步骤配置 `.env` 文件
2. **测试连接**：运行图片生成脚本
3. **检查日志**：查看 `image_generation.log` 文件
4. **验证上传**：检查S3存储桶中是否有新文件
5. **测试访问**：验证生成的URL是否可以访问

## 📋 故障排除

### 常见问题

1. **AWS凭证未配置**
   ```
   ⚠️ AWS S3配置失败: AWS凭证未配置
   ```
   解决方案：检查 `.env` 文件中的 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`

2. **存储桶不存在**
   ```
   ❌ S3上传失败: NoSuchBucket
   ```
   解决方案：检查 `AWS_S3_BUCKET` 配置或创建对应的S3存储桶

3. **权限不足**
   ```
   ❌ S3上传失败: AccessDenied
   ```
   解决方案：为AWS用户分配S3上传权限

### 日志分析

查看 `image_generation.log` 文件，关注以下关键信息：
- `🔧 AWS配置检查` - 验证配置是否正确
- `📤 开始上传文件到S3` - 上传过程详情
- `✅ 文件上传到S3成功` - 上传成功确认
- `❌ S3上传失败` - 错误信息分析

## 🎯 预期结果

配置完成后，您应该看到：
1. 图片生成成功
2. 原始图片和生成图片都上传到S3
3. 返回可访问的S3 URL
4. 详细的日志记录整个过程

如果遇到问题，请检查日志文件并按照故障排除指南进行处理。
