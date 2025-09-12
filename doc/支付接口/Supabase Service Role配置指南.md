# Supabase Service Role 配置指南

## 问题说明

当前代码已更新为使用 Supabase Auth Admin API (`supabase.auth.admin.getUserById()`)，这是获取用户信息的推荐方式。但是，此 API 需要 `service_role` 权限才能正常工作。

## 获取 Service Role Key

### 1. 登录 Supabase Dashboard
访问：https://supabase.com/dashboard

### 2. 选择项目
选择您的 AicePS 项目

### 3. 获取 Service Role Key
1. 点击左侧菜单的 **Settings** (设置)
2. 点击 **API** 标签
3. 在 **Project API keys** 部分找到：
   - `anon` `public` - 这是匿名密钥（已有）
   - `service_role` `secret` - 这是服务角色密钥（需要）

### 4. 复制 Service Role Key
点击 `service_role` 密钥旁边的复制按钮

## 配置环境变量

### 本地环境配置

在 `server/.env` 文件中添加：

```bash
# Supabase Service Role Key (用于后端管理员操作)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjMyMjU2NiwiZXhwIjoyMDUxODk4NTY2fQ.YOUR_SERVICE_ROLE_KEY_HERE
```

### 服务器环境配置

在服务器的 `server/.env` 文件中添加相同的配置：

```bash
# SSH 连接到服务器
ssh -i /Users/a1/work/productmindai.pem ec2-user@54.89.140.250

# 编辑服务器配置文件
nano /home/ec2-user/nanobanana/server/.env

# 添加以下行：
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

## 代码更改说明

### 1. Supabase 客户端初始化
```javascript
// 旧方式：使用匿名密钥
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 新方式：使用 service_role 密钥
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

### 2. 用户信息获取
```javascript
// 旧方式：直接查询 auth.users 表
const { data: userInfo, error: userError } = await supabase
  .from('auth.users')
  .select('email, raw_user_meta_data')
  .eq('id', userId)
  .single();

// 新方式：使用 Auth Admin API
const { data: { user: userInfo }, error: userError } = await supabase.auth.admin.getUserById(userId);
```

### 3. 用户元数据字段
```javascript
// 旧字段名
userInfo?.raw_user_meta_data

// 新字段名
userInfo?.user_metadata
```

## 安全注意事项

### ⚠️ 重要安全提醒

1. **Service Role Key 具有完全管理员权限**
   - 可以绕过所有 RLS (Row Level Security) 策略
   - 可以访问和修改所有数据
   - 绝对不能在前端代码中使用

2. **仅在后端使用**
   - 只能在服务器端代码中使用
   - 不要提交到公共代码仓库
   - 使用环境变量管理

3. **环境隔离**
   - 开发环境和生产环境使用不同的密钥
   - 定期轮换密钥

## 验证配置

### 1. 检查环境变量
```bash
# 在服务器上检查
echo $SUPABASE_SERVICE_ROLE_KEY

# 或检查 .env 文件
grep SUPABASE_SERVICE_ROLE_KEY /home/ec2-user/nanobanana/server/.env
```

### 2. 测试 API 调用
启动后端服务后，查看日志确认用户信息获取成功：

```bash
# 查看后端日志
tail -f /home/ec2-user/nanobanana/server/logs/server-$(date +%Y-%m-%d).log

# 寻找类似的日志：
# [PAYMENTS] [INFO] 用户信息 {"email":"user@example.com","hasMetadata":true,"userId":"uuid"}
```

## 故障排除

### 1. "service_role key is required" 错误
**原因**: 环境变量未正确配置
**解决**: 确保 `SUPABASE_SERVICE_ROLE_KEY` 在 `.env` 文件中正确设置

### 2. "Invalid JWT" 错误
**原因**: Service Role Key 不正确或已过期
**解决**: 从 Supabase Dashboard 重新复制正确的密钥

### 3. "Insufficient permissions" 错误
**原因**: 使用了错误的密钥类型
**解决**: 确保使用的是 `service_role` 密钥，不是 `anon` 密钥

### 4. 用户信息仍然获取失败
**原因**: 用户ID格式不正确或用户不存在
**解决**: 检查传入的 `userId` 是否为有效的 UUID 格式

## 配置完成后的操作

1. **重启后端服务**
   ```bash
   # 停止当前服务
   pkill -f "node server.js"
   
   # 重新启动
   cd /home/ec2-user/nanobanana/server
   nohup node server.js > logs/server-$(date +%Y-%m-%d).log 2>&1 &
   ```

2. **测试支付功能**
   - 访问定价页面
   - 尝试创建订阅
   - 检查后端日志确认用户信息获取成功

## 相关文档

- [Supabase Auth Admin API 文档](https://supabase.com/docs/reference/javascript/auth-admin-getuser)
- [Supabase Service Role 文档](https://supabase.com/docs/guides/api/api-keys)
- [PayPal 集成文档](./PayPal实现总结.md)

## 联系支持

如需协助配置，请联系：
- 技术支持：support@nanobanana.gitagent.io
- Supabase 官方支持：https://supabase.com/support
