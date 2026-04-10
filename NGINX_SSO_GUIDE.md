# Nginx 反向代理 + SSO 单点登录方案

## 方案概述

通过 Nginx 反向代理实现 iframe 同源嵌入 + SSO Cookie 桥接，彻底解决 EKP 跨域登录问题。

## 架构图

```
┌──────────────────────────────────────────────────────────────┐
│                     用户浏览器 (q266fb7gdd.coze.site)         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  iframe src="/ekp-proxy/sys/form/main.jsp?xxx"       │  │
│  │          ▲                                           │  │
│  │          │ 同源访问（Cookie 可用！）                  │  │
│  └──────────┼───────────────────────────────────────────┘  │
└──────────────┼──────────────────────────────────────────────┘
               │
               │ 端口 5000
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Nginx 反向代理 (q266fb7gdd.coze.site:5000)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  location /ekp-proxy/                                 │  │
│  │    proxy_pass https://oa.fjhxrl.com/;                 │  │
│  │    proxy_cookie_domain oa.fjhxrl.com .dev.coze.site;  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  location /                                          │  │
│  │    proxy_pass http://127.0.0.1:5001/;                 │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
               │                              │
               │ 代理 EKP                      │ 代理 Next.js
               ▼                              ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│   EKP 服务器               │  │   Next.js 服务 (5001)      │
│   (oa.fjhxrl.com)          │  │                            │
│   • 表单页面               │  │   • API 代理               │
│   • REST API               │  │   • Cookie 桥接            │
└────────────────────────────┘  └────────────────────────────┘
```

## 文件清单

### 配置文件
- `nginx/nginx.conf` - Nginx 反向代理配置
- `scripts/nginx-dev.sh` - 开发环境启动脚本
- `scripts/nginx-start.sh` - 生产环境启动脚本
- `scripts/nginx-build.sh` - 生产环境构建脚本

### 核心代码
- `src/lib/ekp/cookie-bridge.ts` - Cookie 桥接服务
- `src/lib/utils/crypto.ts` - 加密工具
- `src/app/api/ekp-proxy/[...path]/route.ts` - EKP 代理 API
- `src/app/api/ekp/binding/route.ts` - EKP 账号绑定 API
- `src/components/ai-flow-console/index.tsx` - AI 流程操控台（已更新）

### 数据库
- `database-schema-ekp-session.sql` - EKP Session 表结构

## Nginx 配置关键点

### 1. EKP 反向代理
```nginx
location ^~ /ekp-proxy/ {
    proxy_pass https://oa.fjhxrl.com/;
    proxy_set_header Host "oa.fjhxrl.com";
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 2. Cookie 域名转换
```nginx
proxy_cookie_domain oa.fjhxrl.com .dev.coze.site;
```

### 3. Next.js 上游
```nginx
upstream nextjs_backend {
    server 127.0.0.1:5001;
}

location / {
    proxy_pass http://nextjs_backend;
}
```

## SSO 登录流程

### 1. 用户绑定 EKP 账号
```
用户 → 打开 /admin/integration/ekp/binding
     → 输入 EKP 用户名/密码
     → 系统验证并加密存储
     → 绑定成功
```

### 2. Cookie 桥接服务
```
用户打开 AI 流程操控台
  ↓
获取用户的 EKP 绑定信息
  ↓
使用 EKP 账号密码获取 Session Cookie
  ↓
通过代理 API 注入 Cookie
  ↓
iframe 内自动登录 EKP
```

## API 接口

### EKP 代理 API
```
GET/POST /api/ekp-proxy/[...path]
  - 通过服务端代理访问 EKP
  - 自动注入用户认证 Cookie
  - 处理 Cookie 域名转换
```

### EKP 绑定 API
```
GET  /api/ekp/binding     - 获取绑定状态
POST /api/ekp/binding      - 绑定 EKP 账号
DELETE /api/ekp/binding   - 解绑 EKP 账号
PUT  /api/ekp/binding     - 更新最后使用时间
```

### 数据库初始化
```
POST /api/database/init/ekp-session - 初始化 EKP Session 表
GET  /api/database/init/ekp-session - 检查表是否存在
```

## 启动方式

### 开发环境
```bash
bash scripts/nginx-dev.sh
```

### 生产环境
```bash
bash scripts/nginx-build.sh  # 构建
bash scripts/nginx-start.sh  # 启动
```

## 技术优势

| 特性 | 说明 |
|------|------|
| **同源访问** | iframe 使用同源地址，无跨域限制 |
| **Cookie 共享** | Nginx 自动转换 Cookie 域名 |
| **SSO 登录** | 绑定账号后自动登录 |
| **API 备用** | 未绑定时可使用 API 直接提交 |
| **安全加密** | Cookie/密码使用 AES-256-GCM 加密 |

## 注意事项

1. **数据库表初始化**：首次使用需要执行 `POST /api/database/init/ekp-session`
2. **环境变量**：确保 `EKP_BASE_URL` 设置为 `https://oa.fjhxrl.com`
3. **Nginx 依赖**：部署时需要安装 Nginx（已在 .coze deps 中配置）
4. **端口规划**：
   - 5000: Nginx（对外暴露）
   - 5001: Next.js（内部）
