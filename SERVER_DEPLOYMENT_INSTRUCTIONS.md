# 🚀 NanoBanana 服务器部署指令

## 📋 部署步骤

请在服务器 `54.89.140.250` 上执行以下命令：

### 1. 进入项目目录并拉取最新代码
```bash
cd /home/ec2-user/nanobanana
git pull origin main
```

### 2. 使用统一管理脚本重启服务
```bash
# 停止所有服务
./unified_three_projects_manager.sh stop

# 启动所有服务
./unified_three_projects_manager.sh start

# 检查服务状态
./unified_three_projects_manager.sh status
```

### 3. 验证服务运行状态

#### 检查端口占用
```bash
netstat -tlnp | grep -E ':(8889|3002)'
```

#### 测试后端健康检查
```bash
curl localhost:3002/health
```

#### 测试AI图片定制API
```bash
curl localhost:3002/api/custom-image-generation/health
```

#### 测试前端服务
```bash
curl -I localhost:8889
```

#### 测试API代理
```bash
curl "localhost:8889/api/templates?limit=1"
```

### 4. 验证生产环境访问
```bash
curl -I https://nanobanana.gitagent.io
```

## 🔧 故障排除

### 如果服务启动失败：

1. **检查日志**：
   ```bash
   tail -f /home/ec2-user/nanobanana/server.log
   tail -f /home/ec2-user/nanobanana/frontend.log
   ```

2. **手动启动服务**：
   ```bash
   # 启动后端
   cd /home/ec2-user/nanobanana/server
   nohup node server.js > ../server.log 2>&1 &
   
   # 启动前端
   cd /home/ec2-user/nanobanana
   nohup npm run dev > frontend.log 2>&1 &
   ```

3. **检查环境变量**：
   ```bash
   cat /home/ec2-user/nanobanana/server/.env | grep SUPABASE_URL
   ```

## ✅ 成功标志

- 后端服务：`http://localhost:3002/health` 返回 `{"status":"ok"}`
- 前端服务：`http://localhost:8889` 返回HTML页面
- API代理：`http://localhost:8889/api/templates` 返回模板数据
- 生产环境：`https://nanobanana.gitagent.io` 正常访问

## 🎯 本次更新内容

1. ✅ 修复了AI图片定制助手的500错误
2. ✅ 添加了netlify.toml配置文件
3. ✅ 更新了API路由和错误处理
4. ✅ 增强了图片生成功能
5. ✅ 优化了服务启动流程

## 📞 联系信息

如果遇到问题，请检查：
- 服务器日志文件
- 端口占用情况
- Nginx配置状态
