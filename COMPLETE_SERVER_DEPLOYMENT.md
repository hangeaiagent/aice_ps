# 🚀 完整服务器部署和修复方案

## 🎯 问题分析

### 当前问题：
1. **NanoBanana**: `/api/custom-image-generation` 返回500错误
2. **Spot网站**: https://spot.gitagent.io 返回502 Bad Gateway

### 根本原因：
- 前端服务未正确启动或端口冲突
- 后端服务可能未运行
- Nginx配置可能有问题

## 📋 端口分配规划（避免冲突）

```bash
# 端口分配表
NanoBanana:     后端 3002, 前端 8889 → https://nanobanana.gitagent.io
Spot:           后端 3001, 前端 5173 → https://spot.gitagent.io
Admin:          后端 8000, 前端 9527 → http://54.89.140.250:9527
OrientDirector: 后端 8001, 前端 3003 → https://doro.gitagent.io
```

## 🔧 服务器部署步骤

### 第一步：连接服务器并检查状态

```bash
# 1. SSH连接服务器
ssh -i ~/.ssh/your-key.pem ec2-user@54.89.140.250

# 2. 检查当前端口占用情况
netstat -tlnp | grep -E ':(3001|3002|5173|8889|8000|8001|9527|3003)'

# 3. 检查当前运行的进程
ps aux | grep -E '(node|npm|vite|netlify)' | grep -v grep
```

### 第二步：停止所有服务（清理环境）

```bash
# 停止所有可能冲突的进程
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "netlify" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# 等待进程完全停止
sleep 5

# 确认所有进程已停止
ps aux | grep -E '(node|npm|vite|netlify)' | grep -v grep
```

### 第三步：拉取最新代码

```bash
# 进入NanoBanana项目目录
cd /home/ec2-user/nanobanana
git pull origin main

# 如果有Spot项目，也需要更新
# cd /home/ec2-user/spot
# git pull origin main
```

### 第四步：启动NanoBanana服务

```bash
cd /home/ec2-user/nanobanana

# 启动后端服务（端口3002）
cd server
nohup node server.js > ../nanobanana_server.log 2>&1 &
cd ..

# 等待后端启动
sleep 5

# 验证后端服务
curl localhost:3002/health
curl localhost:3002/api/custom-image-generation/health

# 启动前端服务（端口8889）- 使用Vite而不是netlify
nohup npx vite --port 8889 --host 0.0.0.0 > nanobanana_frontend.log 2>&1 &

# 等待前端启动
sleep 10

# 验证前端服务
curl -I localhost:8889
```

### 第五步：启动Spot服务（如果存在）

```bash
# 如果Spot项目存在，启动其服务
# cd /home/ec2-user/spot

# 启动Spot后端（端口3001）
# cd server
# nohup node server.js > ../spot_server.log 2>&1 &
# cd ..

# 启动Spot前端（端口5173）
# nohup npx vite --port 5173 --host 0.0.0.0 > spot_frontend.log 2>&1 &
```

### 第六步：检查和修复Nginx配置

```bash
# 检查Nginx配置文件
sudo nginx -t

# 查看NanoBanana的Nginx配置
sudo cat /etc/nginx/sites-available/nanobanana.gitagent.io

# 查看Spot的Nginx配置
sudo cat /etc/nginx/sites-available/spot.gitagent.io

# 如果配置有问题，重新加载
sudo systemctl reload nginx
```

## 📝 Nginx配置模板

### NanoBanana配置 (/etc/nginx/sites-available/nanobanana.gitagent.io)

```nginx
server {
    listen 80;
    server_name nanobanana.gitagent.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nanobanana.gitagent.io;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/nanobanana.gitagent.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nanobanana.gitagent.io/privkey.pem;

    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端代理
    location / {
        proxy_pass http://localhost:8889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Spot配置 (/etc/nginx/sites-available/spot.gitagent.io)

```nginx
server {
    listen 80;
    server_name spot.gitagent.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name spot.gitagent.io;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/spot.gitagent.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spot.gitagent.io/privkey.pem;

    # API代理到Spot后端
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端代理到Spot前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ✅ 验证部署结果

### 检查服务状态

```bash
# 1. 检查端口占用
netstat -tlnp | grep -E ':(3001|3002|5173|8889)'

# 2. 测试NanoBanana
curl localhost:3002/health
curl localhost:8889/api/custom-image-generation/health
curl -I https://nanobanana.gitagent.io

# 3. 测试Spot（如果存在）
curl localhost:3001/health
curl localhost:5173
curl -I https://spot.gitagent.io

# 4. 检查日志
tail -f nanobanana_server.log
tail -f nanobanana_frontend.log
```

### 预期结果

1. **NanoBanana**:
   - ✅ https://nanobanana.gitagent.io 正常访问
   - ✅ AI图片定制功能不再500错误

2. **Spot**:
   - ✅ https://spot.gitagent.io 不再502错误
   - ✅ 网站正常访问

## 🚨 故障排除

### 如果仍有502错误：

1. **检查后端服务**：
   ```bash
   curl localhost:3001/health  # Spot
   curl localhost:3002/health  # NanoBanana
   ```

2. **检查前端服务**：
   ```bash
   curl localhost:5173  # Spot
   curl localhost:8889  # NanoBanana
   ```

3. **检查Nginx状态**：
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

4. **查看详细日志**：
   ```bash
   tail -f /var/log/nginx/error.log
   tail -f nanobanana_server.log
   tail -f spot_server.log
   ```

## 📞 部署完成检查清单

- [ ] 所有端口无冲突
- [ ] NanoBanana后端(3002)正常
- [ ] NanoBanana前端(8889)正常  
- [ ] Spot后端(3001)正常
- [ ] Spot前端(5173)正常
- [ ] Nginx配置正确
- [ ] SSL证书有效
- [ ] 两个网站都能正常访问
- [ ] AI图片定制功能正常
