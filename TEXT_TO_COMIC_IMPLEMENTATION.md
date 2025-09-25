# 文字转漫画功能实现文档

## 功能概述

本功能实现了将文字内容自动转换为漫画绘本的完整流程，特别针对有阅读障碍的儿童设计，提供阅读障碍友好的字体和界面。

### 核心特性

1. **智能文本分析** - 使用 DeepSeek LLM 提取关键情节和对话
2. **自动漫画生成** - 集成 Google Imagen 3 生成精美漫画插图
3. **阅读障碍友好** - 支持 OpenDyslexic 字体，提升阅读体验
4. **多种输入方式** - 支持文本输入和拍照OCR识别
5. **原文保留** - 完整保留原始文字内容，满足教育需求
6. **可编辑文本框** - 支持编辑和调整漫画中的文字内容

## 技术架构

### 前端组件
- `TextToComicPage` - 主页面组件
- `TextInput` - 文本输入组件
- `ComicViewer` - 漫画查看器
- `FontToggle` - 字体切换组件
- `ProcessingProgress` - 进度显示组件
- `PhotoUpload` - 照片上传组件
- `ProjectsList` - 项目列表组件

### 后端服务
- `DeepSeekService` - DeepSeek LLM 集成
- `GoogleImagenService` - Google Imagen 图像生成
- `TextToComicService` - 核心业务逻辑
- `FontService` - 字体管理服务
- `OCRService` - 文字识别服务

### 数据库表结构
- `comic_projects` - 漫画项目表
- `comic_pages` - 漫画页面表
- `comic_text_boxes` - 文本框表
- `comic_processing_logs` - 处理日志表

## 安装部署

### 1. 环境准备

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
```

### 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# DeepSeek LLM API
REACT_APP_DEEPSEEK_API_KEY=your_deepseek_api_key

# Google Cloud API
REACT_APP_GOOGLE_API_KEY=your_google_api_key
REACT_APP_GOOGLE_PROJECT_ID=your_google_project_id

# Supabase 配置（如果使用）
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 数据库迁移

```bash
# 运行数据库迁移脚本
psql -d your_database -f database/text_to_comic_schema.sql
```

### 4. 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm run preview
```

## API 配置

### DeepSeek LLM 配置

1. 注册 DeepSeek 账户：https://platform.deepseek.com/
2. 获取 API 密钥
3. 配置环境变量 `REACT_APP_DEEPSEEK_API_KEY`

### Google Imagen 配置

1. 创建 Google Cloud 项目
2. 启用 Vertex AI API
3. 创建服务账户并下载密钥
4. 配置环境变量：
   - `REACT_APP_GOOGLE_API_KEY`
   - `REACT_APP_GOOGLE_PROJECT_ID`

## 使用指南

### 基本使用流程

1. **文本输入**
   - 在文本框中输入或粘贴要转换的文字内容
   - 或使用拍照功能上传包含文字的图片
   - 建议文字长度在 50-2000 字之间

2. **开始转换**
   - 点击"开始转换为漫画"按钮
   - 系统将自动分析文本并生成漫画

3. **查看结果**
   - 在漫画查看器中浏览生成的漫画页面
   - 可以切换字体、编辑文本框
   - 支持全屏模式和原文对照

4. **保存和分享**
   - 项目自动保存到用户账户
   - 可以下载或分享生成的漫画

### 字体设置

系统提供多种阅读友好字体：

- **OpenDyslexic** - 专为阅读障碍者设计
- **Comic Sans MS** - 儿童友好字体
- **Trebuchet MS** - 清晰易读字体
- **Verdana** - 高可读性字体

可以通过字体切换组件调整：
- 字体族
- 字体大小
- 字重
- 行高
- 字母间距

### OCR 文字识别

支持从图片中识别文字：

1. 点击"拍照识别"或"选择图片"
2. 系统自动识别图片中的文字
3. 可以编辑识别结果
4. 继续转换为漫画

支持的图片格式：JPG、PNG、WebP
最大文件大小：10MB

## 开发指南

### 添加新的字体

1. 在 `services/fontService.ts` 中添加字体配置：

```typescript
{
  name: 'NewFont',
  displayName: '新字体',
  cssClass: 'new-font',
  description: '字体描述',
  isAccessible: true,
  loadUrl: 'https://fonts.googleapis.com/css2?family=NewFont'
}
```

2. 在 `styles/dyslexic-fonts.css` 中添加样式：

```css
.new-font {
  font-family: 'NewFont', fallback, sans-serif;
}
```

### 扩展图像生成服务

可以添加其他图像生成服务作为 Google Imagen 的替代：

```typescript
// 在 googleImagenService.ts 中添加新的服务提供商
class NewImageService implements ImageGenerationService {
  async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    // 实现图像生成逻辑
  }
}
```

### 自定义处理流程

可以在 `textToComicService.ts` 中自定义处理步骤：

```typescript
async processTextToComic(projectId: string, onProgress?: (progress: ProcessingProgress) => void) {
  // 自定义处理步骤
  await this.customStep1();
  await this.customStep2();
  // ...
}
```

## 故障排除

### 常见问题

1. **API 密钥无效**
   - 检查环境变量配置
   - 确认 API 密钥有效性
   - 检查 API 配额和权限

2. **图像生成失败**
   - 检查 Google Cloud 项目配置
   - 确认 Vertex AI API 已启用
   - 查看控制台错误日志

3. **字体加载失败**
   - 检查网络连接
   - 确认字体 URL 可访问
   - 查看浏览器控制台错误

4. **OCR 识别不准确**
   - 确保图片清晰度足够
   - 检查光线和对比度
   - 尝试不同的图片角度

### 调试模式

启用调试模式查看详细日志：

```bash
# 设置环境变量
export DEBUG=text-to-comic:*

# 启动应用
npm run dev
```

### 性能优化

1. **图像压缩**
   - 在上传前压缩图片
   - 使用适当的图片格式

2. **缓存策略**
   - 缓存生成的漫画图片
   - 使用 CDN 加速字体加载

3. **批处理**
   - 批量处理多个页面
   - 控制并发请求数量

## 许可证

本功能遵循项目的 Apache-2.0 许可证。

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个功能。

### 开发环境设置

1. Fork 项目仓库
2. 创建功能分支
3. 进行开发和测试
4. 提交 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加适当的类型注解
- 编写单元测试

## 更新日志

### v1.0.0 (2025-01-XX)
- 初始版本发布
- 支持文字转漫画基本功能
- 集成 OpenDyslexic 字体
- 支持 OCR 文字识别

### 计划功能

- [ ] 支持更多图像生成模型
- [ ] 添加漫画风格模板
- [ ] 支持多语言界面
- [ ] 移动端适配优化
- [ ] 离线模式支持

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: support@your-domain.com

---

© 2025 AicePS 项目团队。保留所有权利。