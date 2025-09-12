# PayPal订阅计划创建指南

## 问题诊断

### 1. 用户信息获取失败
**错误信息**：
```
[PAYMENTS] [WARN] 无法获取用户信息，使用默认值
```

**原因**：
- 代码中查询的是 `users` 表，但Supabase使用的是 `auth.users` 表

**解决方案**：
✅ 已修复 - 更新代码使用 `auth.users` 表并使用正确的字段名 `raw_user_meta_data`

### 2. 订阅计划缺少PayPal计划ID
**错误信息**：
```
[PAYMENTS] [ERROR] 订阅计划缺少PayPal计划ID
```

**原因**：
- 数据库中的订阅计划没有配置 `paypal_plan_id`

**解决方案**：
需要在PayPal创建订阅计划并更新数据库

## PayPal订阅计划创建步骤

### 步骤1：登录PayPal Developer Dashboard
1. 访问 https://developer.paypal.com
2. 使用您的PayPal商业账户登录
3. 选择正确的环境（Sandbox或Live）

### 步骤2：创建产品（Product）
1. 导航到 **Dashboard > My Apps & Credentials**
2. 点击 **Products & Plans** 标签
3. 点击 **Create Product**
4. 填写产品信息：
   ```
   Product Name: AicePS AI图像编辑器
   Product Type: SERVICE
   Category: SOFTWARE
   Description: AI驱动的专业图像编辑服务
   ```
5. 点击 **Create Product**
6. 记录产品ID

### 步骤3：为每个套餐创建计划（Plan）

#### 创建入门版计划
1. 在产品页面，点击 **Create Plan**
2. 填写计划信息：
   ```
   Plan Name: 入门版
   Plan Description: 每月100张图片，基础编辑功能
   Status: Active
   ```
3. 设置定价：
   ```
   Pricing Model: Fixed pricing
   Price: 9.99 USD
   Billing Cycle: Monthly
   ```
4. 点击 **Create Plan**
5. 记录计划ID（格式：P-XXXXXXXXXXXXX）

#### 创建专业版计划
1. 重复上述步骤
2. 计划信息：
   ```
   Plan Name: 专业版
   Plan Description: 每月500张图片，高级编辑功能，API访问
   Price: 19.99 USD
   ```

#### 创建企业版计划
1. 重复上述步骤
2. 计划信息：
   ```
   Plan Name: 企业版
   Plan Description: 无限图片处理，全部功能，专属客服
   Price: 49.99 USD
   ```

### 步骤4：更新数据库

执行以下SQL更新数据库中的PayPal计划ID：

```sql
-- 替换为您创建的真实PayPal计划ID
UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-YOUR_STARTER_PLAN_ID'
WHERE plan_code = 'starter';

UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-YOUR_PRO_PLAN_ID'
WHERE plan_code = 'pro';

UPDATE pay_subscription_plans 
SET paypal_plan_id = 'P-YOUR_ENTERPRISE_PLAN_ID'
WHERE plan_code = 'enterprise';
```

## 在Supabase中执行SQL

1. 登录 Supabase Dashboard
2. 选择您的项目
3. 导航到 **SQL Editor**
4. 粘贴并执行 `update_paypal_plan_ids.sql` 中的SQL
5. 验证更新成功

## 验证配置

### 1. 检查数据库
```sql
SELECT plan_code, plan_name, paypal_plan_id 
FROM pay_subscription_plans
WHERE is_active = true;
```

### 2. 测试支付流程
1. 访问定价页面
2. 选择任意套餐
3. 点击订阅按钮
4. 检查后端日志确认：
   - 用户信息获取成功
   - PayPal计划ID存在
   - 订阅创建请求成功

## 环境配置检查清单

### Sandbox环境（测试）
- [ ] PayPal Sandbox账户已创建
- [ ] Sandbox Client ID配置正确
- [ ] Sandbox Secret配置正确
- [ ] PAYPAL_API_URL = https://api-m.sandbox.paypal.com

### Production环境（生产）
- [ ] PayPal商业账户已验证
- [ ] Live Client ID配置正确
- [ ] Live Secret配置正确
- [ ] PAYPAL_API_URL = https://api-m.paypal.com

## 常见问题

### Q1: 如何切换测试/生产环境？
**答**：更新 `.env` 文件中的配置：
```bash
# Sandbox (测试)
PAYPAL_CLIENT_ID=sandbox_client_id
PAYPAL_CLIENT_SECRET=sandbox_secret
PAYPAL_API_URL=https://api-m.sandbox.paypal.com

# Production (生产)
PAYPAL_CLIENT_ID=live_client_id
PAYPAL_CLIENT_SECRET=live_secret
PAYPAL_API_URL=https://api-m.paypal.com
```

### Q2: 订阅计划价格不匹配怎么办？
**答**：确保PayPal计划的价格与数据库中的 `monthly_price` 完全一致

### Q3: 如何查看PayPal API日志？
**答**：
1. 登录 PayPal Developer Dashboard
2. 导航到 **Dashboard > Sandbox/Live > API Calls**
3. 查看API调用历史和错误详情

## 修复后的代码更新

### 1. 用户查询修复（server/routes/payments-simple.mjs）
```javascript
// 修复前：查询 'users' 表
const { data: userInfo, error: userError } = await supabase
  .from('users')
  .select('email, user_metadata')
  
// 修复后：查询 'auth.users' 表
const { data: userInfo, error: userError } = await supabase
  .from('auth.users')
  .select('email, raw_user_meta_data')
```

### 2. 用户名称解析优化
```javascript
subscriber: {
  name: {
    given_name: userInfo?.raw_user_meta_data?.full_name?.split(' ')[0] || 
                userInfo?.raw_user_meta_data?.first_name || 
                userInfo?.email?.split('@')[0] || 
                'User',
    surname: userInfo?.raw_user_meta_data?.full_name?.split(' ')[1] || 
             userInfo?.raw_user_meta_data?.last_name || 
             'Customer'
  },
  email_address: userInfo?.email || 'user@example.com'
}
```

## 下一步行动

1. **立即执行**：在Supabase中运行 `update_paypal_plan_ids.sql`
2. **创建PayPal计划**：按照上述步骤在PayPal Dashboard创建订阅计划
3. **更新计划ID**：将真实的PayPal计划ID更新到数据库
4. **部署代码**：将修复后的代码部署到服务器
5. **测试验证**：完整测试支付流程

## 联系支持

如需协助，请联系：
- PayPal技术支持：https://developer.paypal.com/support
- 项目支持：support@nanobanana.gitagent.io
