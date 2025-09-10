# AicePS 数据库架构差异对比

## 概述

此文档对比了三个数据库架构文件的差异：
- `aiceps_database_schema_fixed.sql` (已部署的原始版本)
- `payment_schema.sql` (新的支付系统架构)
- `init.sql` (完整的初始化脚本)

## 主要差异

### 1. 新增表

#### 在 `init.sql` 中新增的表：
- **`user_profiles`** - 用户配置表，扩展 Supabase Auth 用户信息
- **`nano_user_projects`** - Nano用户项目表，存储图像编辑项目
- **`nano_user_usage_stats`** - Nano用户使用统计表，记录操作统计

### 2. 外键引用差异

| 表名 | 原始版本 | 新版本 | 说明 |
|------|----------|--------|------|
| `pay_user_subscriptions` | `users(id)` | `auth.users(id)` | 引用 Supabase 认证表 |
| `pay_user_credits` | `users(id)` | `auth.users(id)` | 引用 Supabase 认证表 |
| `pay_credit_transactions` | `users(id)` | `auth.users(id)` | 引用 Supabase 认证表 |
| `pay_feature_usage` | `users(id)` | `auth.users(id)` | 引用 Supabase 认证表 |
| `pay_payment_orders` | `users(id)` | `auth.users(id)` | 引用 Supabase 认证表 |

### 3. 套餐数据差异

#### 新增套餐：
- **免费版 (free)** - 0积分，基础功能

#### 套餐代码更新：
原始版本包含：`starter`, `advanced`, `professional`, `lifetime`
新版本包含：`free`, `starter`, `advanced`, `professional`, `lifetime`

### 4. 新增功能

#### 存储过程：
- `consume_user_credits()` - 消费用户积分
- `add_user_credits()` - 添加用户积分
- `sync_user_profile()` - 自动同步用户配置

#### 触发器：
- `trigger_update_user_profiles_updated_at` - 用户配置更新时间
- `trigger_update_user_projects_updated_at` - 项目更新时间
- `trigger_sync_user_profile` - 用户注册时自动同步

#### 行级安全策略 (RLS)：
- 所有新表都启用了 RLS
- 用户只能访问自己的数据
- 套餐信息对所有人可见

### 5. 索引优化

#### 新增索引：
- `idx_pay_feature_usage_status` - 功能使用状态索引
- 用户配置表相关索引
- Nano用户项目表相关索引
- Nano用户统计表相关索引

## 迁移建议

### 执行顺序：
1. 运行 `migration_update.sql` 脚本
2. 验证所有表结构正确
3. 检查外键约束
4. 测试 RLS 策略
5. 验证存储过程功能

### 注意事项：
1. **备份数据** - 执行迁移前请备份现有数据
2. **测试环境** - 建议先在测试环境执行
3. **外键约束** - 确保 `auth.users` 表存在相关用户数据
4. **权限检查** - 验证 RLS 策略是否正常工作

## 兼容性

### 向后兼容：
- ✅ 现有支付表结构保持不变
- ✅ 现有数据不会丢失
- ✅ 现有功能继续工作

### 新功能：
- ✅ 用户配置管理
- ✅ 项目保存功能
- ✅ 使用统计跟踪
- ✅ 免费版套餐支持

## 验证脚本

执行以下 SQL 验证迁移是否成功：

```sql
-- 检查新表是否创建成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'nano_user_projects', 'nano_user_usage_stats');

-- 检查外键约束是否正确
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name LIKE 'pay_%';

-- 检查套餐数据
SELECT plan_code, plan_name, plan_name_en FROM pay_subscription_plans ORDER BY sort_order;

-- 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';
```
