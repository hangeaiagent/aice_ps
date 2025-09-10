# AicePS 服务器部署文档

## 项目概述

AicePS 是一款功能强大的网页版 AI 照片编辑器，基于 Google Gemini API，支持 AI 图像生成、智能修饰、创意滤镜等功能。

- **GitHub 仓库**: https://github.com/hangeaiagent/aice_ps
- **技术栈**: React 19 + TypeScript + Vite + Google Gemini API
- **部署方式**: 前端应用 + Nginx 反向代理

## 服务器配置

### 基础信息
- **服务器地址**: 54.89.140.250
- **SSH 连接**: `ssh -i /Users/a1/work/productmindai.pem ec2-user@54.89.140.250`
- **操作系统**: Amazon Linux 2
- **项目目录**: `/home/ec2-user/nanobanana`

### 域名和SSL
- **域名**: nanobanana.gitagent.io
- **SSL证书**: Let's Encrypt (自动续期)
- **访问地址**: https://nanobanana.gitagent.io

## 环境配置

### Conda 环境
```bash
# 创建环境
conda create -n AicePS python=3.9 -y

# 激活环境
conda activate AicePS

# 安装 Node.js
conda install nodejs=20 -c conda-forge -y
```

### 项目部署
```bash
# 克隆项目
cd /home/ec2-user
git clone https://github.com/hangeaiagent/aice_ps.git nanobanana

# 安装依赖
cd nanobanana
npm install

# 配置环境变量
echo "GEMINI_API_KEY=AIzaSyC3fc8-5r4SWOISs0IIduiE4TOvE8-aFC0" > .env
```

## Vite 配置

### vite.config.ts
```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      server: {
        host: '0.0.0.0',
        port: 8889,
        cors: true,
        allowedHosts: ['nanobanana.gitagent.io', 'localhost', '127.0.0.1'],
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

## Nginx 配置

### 站点配置文件
路径: `/etc/nginx/sites-available/nanobanana.gitagent.io`

```nginx
server {
    listen 80;
    server_name nanobanana.gitagent.io;
    
    location / {
        proxy_pass http://localhost:8889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### SSL 配置 (由 Certbot 自动生成)
```bash
# 获取 SSL 证书
sudo certbot --nginx -d nanobanana.gitagent.io --non-interactive --agree-tos --email admin@gitagent.io

# 启用站点
sudo ln -sf /etc/nginx/sites-available/nanobanana.gitagent.io /etc/nginx/sites-enabled/

# 重新加载配置
sudo nginx -t && sudo systemctl reload nginx
```

## 应用启动

### 启动命令
```bash
# 激活环境
source ~/.bashrc && conda activate AicePS

# 进入项目目录
cd /home/ec2-user/nanobanana

# 启动应用 (后台运行)
nohup npm run dev > app.log 2>&1 &

# 或者前台运行 (用于调试)
npm run dev -- --port 8889 --host 0.0.0.0
```

### 进程管理
```bash
# 查看运行状态
ps aux | grep npm | grep -v grep

# 停止应用
pkill -f 'npm run dev'

# 查看日志
tail -f /home/ec2-user/nanobanana/app.log
```

## 端口配置

### 固定端口规则
- **应用端口**: 8889 (固定，避免与其他服务冲突)
- **Nginx 监听**: 80 (HTTP) / 443 (HTTPS)
- **内部代理**: localhost:8889

### 防火墙配置
```bash
# 确保端口开放
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8889
```

## 故障排除

### 常见问题

1. **502 Bad Gateway**
   - 检查应用是否在 8889 端口运行
   - 检查 Nginx 配置是否正确
   - 查看应用日志: `tail -f app.log`

2. **403 Forbidden**
   - 检查 Vite 配置中的 `allowedHosts`
   - 确保域名在允许列表中

3. **应用无法启动**
   - 检查 conda 环境是否激活
   - 检查 Node.js 版本 (需要 ≥18)
   - 检查端口是否被占用

### 调试命令
```bash
# 检查端口占用
netstat -tlnp | grep 8889

# 测试本地访问
curl -I http://localhost:8889

# 测试域名访问
curl -I https://nanobanana.gitagent.io

# 检查 Nginx 状态
sudo nginx -t
sudo systemctl status nginx
```

## 维护操作

### 更新代码
```bash
cd /home/ec2-user/nanobanana
git pull origin main
npm install
pkill -f 'npm run dev'
nohup npm run dev > app.log 2>&1 &
```

### SSL 证书续期
```bash
# 测试续期
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew
```

### 日志管理
```bash
# 清理日志
> /home/ec2-user/nanobanana/app.log

# 日志轮转 (可选)
sudo logrotate -f /etc/logrotate.conf
```

## 项目规则

### 开发规范
- 固定使用端口 8889，避免冲突
- 使用独立的 conda 环境 AicePS
- 所有配置修改需要重启应用生效
- SSL 证书自动续期，无需手动干预

### 部署流程
1. 停止旧应用进程
2. 更新代码和配置
3. 重新安装依赖 (如需要)
4. 启动新应用进程
5. 验证访问正常

---

**最后更新**: 2025-09-10
**维护人员**: AI Assistant
**联系方式**: admin@gitagent.io
