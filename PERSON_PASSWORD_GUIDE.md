# 创建人员密码处理说明

## 问题描述

**用户反馈**：
- 在组织架构管理中创建人员时，表单没有密码字段
- 用户不知道初始密码是什么
- 担心安全性问题

## 当前实现

### 1. 后端密码处理逻辑

**文件**：`src/app/api/organization/route.ts`

**创建人员时的密码逻辑**：
```typescript
// 如果没有提供密码，生成随机密码
const password = (data.fd_password as string) || generateRandomPassword(12, {
  includeNumbers: true,
  includeSpecialChars: false,
  includeUppercase: true,
});
const hashedPassword = await hashPassword(password);
```

**密码生成规则**：
- 长度：12 位
- 包含数字
- 包含大写字母
- 不包含特殊字符
- 示例：`AbC123Def456`

### 2. 前端表单字段

**文件**：`src/components/org-element-dialog.tsx`

**人员创建表单字段**：
- 姓名（必填）
- 编号（选填）
- 排序号（选填）
- 邮箱（选填）
- 手机号码（选填）
- 登录名（必填）
- **登录密码（选填，留空自动生成）**

### 3. 保存成功提示

**自动生成密码时的提示**：
```
人员创建成功！登录密码：AbC123Def456

请妥善保管登录密码！
```

**手动设置密码时的提示**：
```
人员创建成功！
```

## 旧版本说明（已废弃）

在优化之前（2026-04-06 之前），创建人员时的默认密码是 **`123456`**。

**旧代码**：
```typescript
const password = (data.fd_password as string) || '123456';
```

**问题**：
- 密码过于简单，不安全
- 用户不知道默认密码是什么
- 存在安全风险

## 安全性说明

### 1. 密码加密

- 使用 bcrypt 加密（盐值轮数 10）
- 数据库中存储的是加密后的密码
- 原始密码不会存储在数据库中

### 2. 随机密码生成

使用 `generateRandomPassword()` 函数生成安全的随机密码：
- 确保每次生成的密码不同
- 符合密码强度要求
- 避免使用常见密码

### 3. 密码可见性

- 密码只在创建成功后显示一次
- 用户需要自行保管密码
- 系统不记录原始密码

## 用户使用指南

### 场景 1：创建人员时自动生成密码

**操作步骤**：
1. 访问组织架构管理页面
2. 选择"人员"视图
3. 点击"新建人员"
4. 填写人员信息（姓名、登录名等）
5. **登录密码字段留空**
6. 点击"新建"按钮
7. 系统自动生成 12 位随机密码
8. 弹窗提示显示密码
9. 用户记录密码后关闭弹窗

**密码提示示例**：
```
人员创建成功！登录密码：XyZ789AbC123

请妥善保管登录密码！
```

### 场景 2：创建人员时手动设置密码

**操作步骤**：
1. 访问组织架构管理页面
2. 选择"人员"视图
3. 点击"新建人员"
4. 填写人员信息（姓名、登录名等）
5. 在"登录密码"字段输入自定义密码
6. 点击"新建"按钮
7. 系统使用自定义密码
8. 弹窗提示"人员创建成功！"

### 场景 3：修改人员密码

**当前限制**：
- 编辑人员功能暂不支持修改密码
- 如需修改密码，需要通过管理员后台或直接修改数据库

**临时解决方案**：
1. 通过数据库直接修改 `sys_org_person.fd_password` 字段
2. 使用密码工具生成新的加密密码：
```typescript
import { hashPassword } from '@/lib/password/password-utils';
const hashedPassword = await hashPassword('新密码');
```

## 技术实现细节

### 1. 密码生成函数

**文件**：`src/lib/password/password-utils.ts`

**函数签名**：
```typescript
function generateRandomPassword(
  length: number,
  options?: {
    includeNumbers?: boolean;
    includeSpecialChars?: boolean;
    includeUppercase?: boolean;
  }
): string
```

**使用示例**：
```typescript
// 生成 12 位密码，包含数字和大写字母
const password = generateRandomPassword(12, {
  includeNumbers: true,
  includeSpecialChars: false,
  includeUppercase: true,
});
// 示例输出：AbC123Def456
```

### 2. 密码加密函数

**函数签名**：
```typescript
function hashPassword(password: string, rounds?: number): Promise<string>
```

**使用示例**：
```typescript
const hashedPassword = await hashPassword('myPassword123', 10);
// 输出：$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq
```

### 3. 密码验证函数

**函数签名**：
```typescript
function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>
```

**使用示例**：
```typescript
const isValid = await verifyPassword('myPassword123', hashedPassword);
// 输出：true
```

## 注意事项

1. **密码只显示一次**
   - 自动生成的密码只在创建成功后显示
   - 关闭弹窗后无法再次查看
   - 请用户自行保管密码

2. **密码强度**
   - 生成的密码符合安全标准
   - 建议用户首次登录后修改密码
   - 避免使用过于简单的密码

3. **兼容性**
   - 新密码逻辑向后兼容
   - 旧版本的 `123456` 密码仍然可以使用
   - 建议旧用户修改密码

4. **安全性**
   - 密码使用 bcrypt 加密存储
   - 原始密码不会存储在数据库
   - 即使数据库泄露，密码也无法直接解密

## 验证清单

- [x] 创建人员时自动生成随机密码
- [x] 创建人员时可以手动设置密码
- [x] 创建成功后显示密码提示
- [x] 密码使用 bcrypt 加密
- [x] 密码生成规则安全可靠
- [x] TypeScript 类型检查通过
- [ ] 用户首次登录后修改密码功能（待实现）
- [ ] 管理员重置用户密码功能（待实现）
- [ ] 密码过期和强制修改功能（待实现）

## 未来优化方向

1. **添加密码强度检查**
   - 前端实时显示密码强度
   - 禁止使用弱密码
   - 提供密码强度建议

2. **添加密码重置功能**
   - 管理员可以重置用户密码
   - 支持发送密码重置邮件
   - 支持短信验证码重置

3. **添加密码过期策略**
   - 设置密码有效期
   - 提醒用户定期修改密码
   - 强制用户修改过期密码

4. **添加登录失败限制**
   - 记录登录失败次数
   - 超过次数锁定账户
   - 支持验证码解锁
