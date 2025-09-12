# NB模板库服务器部署指南

## 🚀 快速部署步骤

### 1. 连接服务器
```bash
ssh ec2-user@54.89.140.250
```

### 2. 执行部署脚本
```bash
cd /home/ec2-user/nanobanana
wget https://raw.githubusercontent.com/hangeaiagent/aice_ps/main/deploy-server.sh
chmod +x deploy-server.sh
./deploy-server.sh
```

### 3. 手动执行数据库迁移
在Supabase控制台中执行以下SQL脚本：
- 文件路径: `database/nb_template_migration.sql`
- 或直接访问: https://github.com/hangeaiagent/aice_ps/blob/main/database/nb_template_migration.sql

执行完成后创建标记文件：
```bash
touch .migration_completed
```

## 📋 详细部署步骤

### 步骤1: 代码更新
```bash
cd /home/ec2-user/nanobanana
git stash                    # 备份本地更改
git pull origin main         # 拉取最新代码
```

### 步骤2: 环境配置

#### 后端环境变量 (server/.env)
确保包含以下配置：
```bash
# Supabase配置
SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo
```

#### 前端环境变量 (.env)
```bash
VITE_API_BASE_URL=/api
VITE_USE_SERVER_GENERATION=true
VITE_SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc
```

### 步骤3: 数据库迁移
1. 登录Supabase控制台: https://app.supabase.com
2. 选择项目: uobwbhvwrciaxloqdizc
3. 进入SQL Editor
4. 执行 `database/nb_template_migration.sql` 脚本

### 步骤4: 安装依赖
```bash
# 前端依赖
npm install

# 后端依赖
cd server && npm install && cd ..
```

### 步骤5: 构建前端
```bash
npm run build
```

### 步骤6: 停止现有服务
```bash
# 停止所有相关进程
pkill -f "node.*server.js"
pkill -f "npm.*dev"
pkill -f "vite"
pkill -f "netlify"

# 检查端口占用
netstat -tlnp | grep -E ':(8889|3002)'
```

### 步骤7: 启动服务

#### 启动后端 (端口3002)
```bash
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..
```

#### 启动前端 (端口8889)
```bash
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &
```

### 步骤8: 验证部署

#### 检查服务状态
```bash
# 检查进程
ps aux | grep -E "(node.*server|netlify)" | grep -v grep

# 检查端口
netstat -tlnp | grep -E ':(8889|3002)'
```

#### 健康检查
```bash
# 后端健康检查
curl http://localhost:3002/health

# 前端状态检查
curl -I http://localhost:8889

# 模板API测试
curl "http://localhost:8889/api/templates?limit=1"
```

#### 外部访问测试
```bash
# 通过域名访问
curl https://nanobanana.gitagent.io/api/health
curl "https://nanobanana.gitagent.io/api/templates?limit=1"
```

## 🔧 故障排查

### 常见问题

#### 1. 502 Bad Gateway
```bash
# 检查应用是否在正确端口运行
netstat -tlnp | grep 8889

# 检查Nginx配置
sudo nginx -t
grep "localhost:8889" /etc/nginx/sites-available/nanobanana.gitagent.io
```

#### 2. 403 Forbidden
检查vite.config.ts中的allowedHosts配置：
```javascript
allowedHosts: [
  'nanobanana.gitagent.io',
  'localhost',
  '127.0.0.1'
]
```

#### 3. 数据库连接错误
```bash
# 检查环境变量
grep SUPABASE server/.env

# 检查后端日志
tail -f server.log
```

#### 4. 模板API返回空数据
```bash
# 检查数据库迁移状态
ls -la .migration_completed

# 检查后端SQL日志
curl "http://localhost:3002/api/templates?limit=1" && tail -f server.log
```

## 📊 监控和日志

### 日志文件位置
- 前端日志: `frontend.log`
- 后端日志: `server.log`
- Nginx日志: `/var/log/nginx/`

### 实时监控
```bash
# 监控后端日志
tail -f server.log

# 监控前端日志
tail -f frontend.log

# 监控系统资源
htop
```

## 🎯 验证清单

- [ ] 代码已更新到最新版本
- [ ] 数据库迁移已执行
- [ ] 环境变量配置正确
- [ ] 前后端服务正常启动
- [ ] 端口8889和3002正常监听
- [ ] 健康检查API返回正常
- [ ] 模板API返回数据库数据
- [ ] 外部域名访问正常
- [ ] SQL查询日志显示数据库查询

## 🔄 回滚方案

如果部署出现问题，可以快速回滚：

```bash
# 回滚代码
git reset --hard HEAD~1

# 重启服务
pkill -f "node.*server.js"
pkill -f "netlify"
cd server && nohup node server.js > ../server.log 2>&1 &
nohup npx netlify dev --port 8889 > frontend.log 2>&1 &
```
