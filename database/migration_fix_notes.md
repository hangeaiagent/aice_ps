# 数据库迁移脚本修复说明

## 修复的问题

### 1. UUID格式错误修复
**问题**: `ERROR: 22P02: invalid input syntax for type uuid: "template-figurine-design"`

**原因**: 原始模板ID使用字符串格式，不是有效的UUID格式

**修复**: 
- 将所有模板ID从字符串格式改为使用 `gen_random_uuid()` 生成
- 修改标签关联逻辑，通过模板标题查找ID而不是硬编码ID

### 2. 修复的文件
- `database/nb_template_migration.sql` - 主迁移脚本

### 3. 修复的具体内容
1. **模板插入部分**:
   ```sql
   -- 修复前
   'template-figurine-design'::UUID,
   
   -- 修复后
   gen_random_uuid(),
   ```

2. **标签关联部分**:
   ```sql
   -- 修复前
   ('template-figurine-design'::UUID, tag_hot_id),
   
   -- 修复后
   SELECT id INTO template_figurine_id FROM nb_templates WHERE title = '热门手办';
   (template_figurine_id, tag_hot_id),
   ```

## 使用说明

现在可以直接执行主迁移脚本：

```bash
psql -h your-host -U postgres -d your-database -f database/nb_template_migration.sql
```

所有UUID格式问题已经修复，脚本应该可以正常执行。
