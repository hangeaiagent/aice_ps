# 文字转漫画功能文档

## 功能概述

文字转漫画功能旨在帮助有阅读障碍的儿童更好地理解文本内容。该功能将大段文字转换为生动的漫画场景，同时保留原文并使用阅读障碍友好字体（OpenDyslexic）显示。

## 核心功能

### 1. 文字输入方式
- **手动输入**：直接在文本框中输入或粘贴文字
- **拍照上传**：上传包含文字的图片，通过OCR技术自动提取文字

### 2. 智能场景提取
- 使用 **Deepseek LLM** 分析文本
- 自动提取3-6个关键情节
- 生成每个场景的视觉描述
- 保持故事的连贯性和完整性

### 3. 漫画生成
- 使用 **Google Nanobanana** 生成漫画风格插图
- 每个场景对应一幅漫画
- 支持多种漫画风格（cartoon、anime、realistic等）

### 4. 阅读模式
- **分屏模式**：左侧显示漫画，右侧显示对应文字
- **漫画模式**：网格展示所有漫画场景
- **文字模式**：仅显示文字内容，使用阅读障碍友好字体

### 5. 辅助功能
- **OpenDyslexic字体**：专为阅读障碍设计的字体
- **场景导航**：前进/后退按钮快速切换场景
- **重新生成**：对不满意的漫画可以重新生成
- **导出功能**：将生成的漫画书导出为JSON格式

## 技术架构

### 前端组件
```
/components/TextToComicPage.tsx    # 主页面组件
/services/textToComicService.ts    # 业务逻辑服务
/public/fonts/opendyslexic.css    # 字体样式
```

### 后端API
```
/server/routes/text-to-comic.mjs   # API路由
  - POST /api/ocr/extract-text     # OCR文字提取
  - POST /api/deepseek/extract-scenes  # 场景提取
  - POST /api/nanobanana/generate-comic # 漫画生成
```

### 技术栈
- **前端**：React + TypeScript + Tailwind CSS
- **动画**：Framer Motion
- **图标**：Heroicons
- **后端**：Node.js + Express
- **AI服务**：
  - Deepseek API（文本分析）
  - Google Nanobanana API（图像生成）
  - Google Vision API（OCR）

## 环境配置

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 到 `.env` 并填写以下配置：

```env
# 文字转漫画功能相关API
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
VITE_NANOBANANA_API_KEY=your_nanobanana_api_key

# 后端代理配置
DEEPSEEK_API_KEY=your_deepseek_api_key
NANOBANANA_API_KEY=your_nanobanana_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# 是否使用后端代理（推荐）
VITE_USE_BACKEND_PROXY=true
```

### 3. 启动服务

#### 开发环境
```bash
# 启动后端服务
npm run server

# 启动前端开发服务器
npm run dev
```

#### 生产环境
```bash
# 构建前端
npm run build

# 启动生产服务器
NODE_ENV=production npm run server
```

## API说明

### OCR文字提取
```javascript
POST /api/ocr/extract-text
Content-Type: multipart/form-data

Body:
- image: File (图片文件)

Response:
{
  "text": "提取的文字内容"
}
```

### 场景提取
```javascript
POST /api/deepseek/extract-scenes
Content-Type: application/json

Body:
{
  "text": "要分析的文本内容"
}

Response:
{
  "title": "故事标题",
  "style": "cartoon",
  "scenes": [
    {
      "text": "场景原文",
      "description": "场景视觉描述"
    }
  ]
}
```

### 漫画生成
```javascript
POST /api/nanobanana/generate-comic
Content-Type: application/json

Body:
{
  "description": "场景描述",
  "style": "cartoon"
}

Response:
{
  "imageUrl": "生成的图片URL"
}
```

## 使用流程

1. **用户输入文字**
   - 直接输入或粘贴文字
   - 或上传图片进行OCR识别

2. **点击"生成漫画"**
   - 系统调用Deepseek API分析文本
   - 提取关键场景和生成描述

3. **生成漫画图片**
   - 为每个场景调用Nanobanana API
   - 生成对应的漫画插图

4. **展示结果**
   - 用户可以选择不同的查看模式
   - 可以导航浏览各个场景
   - 原文使用阅读障碍友好字体显示

## 产品特点

### 教育价值
- **提高理解力**：视觉化呈现帮助理解抽象概念
- **保持完整性**：保留原文，不影响学习要求
- **增强兴趣**：漫画形式提高阅读兴趣

### 技术创新
- **智能分析**：AI自动识别关键情节
- **个性化生成**：每次生成的漫画都是独特的
- **无障碍设计**：专门针对阅读障碍优化

### 适用场景
- 语文阅读理解练习
- 故事书阅读
- 作文素材理解
- 课文预习复习

## 未来优化方向

1. **支持更多语言**：目前主要支持中文，计划支持英语等
2. **自定义风格**：允许用户选择不同的漫画风格
3. **语音朗读**：添加文字转语音功能
4. **保存历史**：用户可以保存和管理生成的漫画书
5. **协作功能**：老师可以为学生创建漫画教材
6. **离线支持**：缓存已生成的内容供离线查看

## 注意事项

1. **API限制**：各API服务可能有调用频率限制
2. **内容审核**：确保输入内容适合儿童
3. **版权问题**：生成的图片仅供个人学习使用
4. **性能优化**：长文本可能需要较长处理时间

## 故障排除

### 常见问题

**Q: OCR识别不准确怎么办？**
A: 确保图片清晰，文字对比度高。可以手动编辑识别结果。

**Q: 漫画生成失败？**
A: 检查API配置是否正确，网络连接是否正常。系统会自动使用模拟数据作为备份。

**Q: 字体显示不正确？**
A: 确保浏览器支持Web字体，清除缓存后重试。

## 联系支持

如有问题或建议，请联系技术支持团队。

---

*本功能专为帮助阅读障碍儿童设计，让每个孩子都能享受阅读的乐趣。*