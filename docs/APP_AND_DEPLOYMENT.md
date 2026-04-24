# 个人物品资产管理应用说明与部署指南

## 1. 应用是什么

这是一个给个人使用的物品资产管理后台。它的目标是替代 Obsidian 里的手工 Markdown 表格，让你不用打开 Obsidian，也能在网页里维护自己持有、观望、退役、出售中的物品。

应用当前面向单人使用，不做多人共享资产管理，也不保存照片、票据、保修单等附件。数据主来源是 Supabase 云端数据库，Obsidian 只作为导入来源和 Markdown 备份导出目标。

## 2. 核心功能

### 物品管理

每个物品可以记录这些字段：

- 物品名称
- 分类
- 购买日期
- 购买金额
- 状态
- 计价方式
- 使用次数
- 出售金额
- 退役日期
- 备注

状态支持：

- `观望中`
- `持有中`
- `已退役`
- `咸鱼ing`
- `已卖出`

计价方式支持：

- `按天`
- `按次`

### 分类管理

应用支持维护物品分类。没有分类时，系统会自动初始化默认分类：

- `电子产品`
- `家具`
- `其他`

分类保存在 Supabase 的 `categories` 表中，每个分类都绑定当前登录用户。

### 统计面板

首页就是管理台，不是营销页。顶部会显示：

- 总物品数
- 持有中数量
- 观望中数量
- 净资产成本

每一行物品会实时计算：

- 持有天数
- 净成本
- 均价

计算规则：

- `净成本 = 购买金额 - 出售金额`
- `持有中` / `咸鱼ing`：从购买日期计算到今天
- `已退役` / `已卖出`：从购买日期计算到退役日期
- `按天均价 = 净成本 / 持有天数`
- `按次均价 = 净成本 / 使用次数`
- 如果按次物品的使用次数为 `0`，均价显示为 `-`

### 筛选和搜索

主区域是可筛选表格，支持按这些条件筛选：

- 分类
- 状态
- 计价方式
- 关键词搜索

### Markdown 导入和导出

应用支持和 Obsidian 里的 Markdown 表格互通。

支持导入的表头格式：

```markdown
| 物品 | 购买日期 | 金额(¥) | 状态 | 计价 | 使用次数 | 出售金额 | 退役日期 | 备注 |
```

导出时也会生成兼容这个表头的 Markdown 表格，方便粘回 Obsidian 或作为备份保存。

注意：应用不会和本机 Obsidian 文件做双向实时同步。原因是线上 Vercel 应用无法直接访问你 Mac 本地的 Obsidian 文件路径。日常主数据源是 Supabase 数据库，Obsidian 更适合作为导入来源和导出备份。

## 3. 技术架构

### 前端和应用层

- Next.js App Router
- TypeScript
- React
- Server Actions
- Supabase SSR 客户端
- Zod 输入校验

Next.js 同时负责：

- 登录页
- Dashboard 页面
- 表单交互
- Server Actions
- Supabase session cookie 刷新
- 未登录重定向
- 管理员邮箱限制

### 后端和数据库

后端使用 Supabase 云端服务，不需要本地部署数据库。

Supabase 负责：

- Auth 登录
- Postgres 数据库
- Row Level Security
- 用户会话

Vercel 只托管 Next.js 应用，不保存数据库。

实际流量路径是：

```text
浏览器 -> Vercel Next.js 应用 -> Supabase Auth / Supabase Postgres
```

## 4. 数据库结构

数据库 schema 在：

```text
supabase/schema.sql
```

### categories 表

字段：

- `id`
- `user_id`
- `name`
- `icon`
- `sort_order`
- `created_at`
- `updated_at`

用途：保存当前用户自己的物品分类。

### items 表

字段：

- `id`
- `user_id`
- `category_id`
- `name`
- `purchase_date`
- `amount_cents`
- `status`
- `pricing_method`
- `usage_count`
- `sale_amount_cents`
- `retired_date`
- `notes`
- `created_at`
- `updated_at`

金额统一用整数分存储，例如 `1999` 表示 `¥19.99`。界面显示时再格式化为人民币金额。

## 5. 安全设计

这个应用是个人后台，所以安全边界重点是：

1. 所有数据页要求登录。
2. 只有 `ADMIN_EMAIL` 指定的邮箱可以进入后台；如果没有配置 `ADMIN_EMAIL`，应用会拒绝进入后台，避免生产环境误开放。
3. Supabase RLS 限制用户只能读写自己的 `categories` 和 `items`。
4. GitHub 仓库不提交 `.env.local`。
5. 不使用、不提交 Supabase `service_role` key 或 `sb_secret_...` key。
6. 不上传照片、票据、保修单，减少敏感数据存储面。
7. 数据库约束会阻止删除仍有物品的分类，避免级联误删资产记录。

需要理解的一点：

`NEXT_PUBLIC_SUPABASE_ANON_KEY` 是浏览器端可见的 publishable/anon key，这是 Supabase 前端应用的正常设计。真正保护数据的是 Supabase Auth、RLS policy，以及应用层的 `ADMIN_EMAIL` 检查。不要把 `service_role` key 或 secret key 放到前端，也不要提交到 GitHub。

## 6. 本地开发

### 依赖要求

- Node.js
- npm
- Supabase 云端项目

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase publishable/anon key
ADMIN_EMAIL=允许登录后台的邮箱
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL` 来自 Supabase 项目的 API 设置页。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 使用 publishable/anon key，不要使用 secret key。
- `ADMIN_EMAIL` 用来限制只有你自己的邮箱能访问后台。
- `DATABASE_URL` 只在需要从本机执行 SQL migration 时临时使用，不要提交到 GitHub，也不要暴露给浏览器端代码。

### 创建数据库表

打开 Supabase Dashboard：

1. 进入你的项目
2. 打开 SQL Editor
3. 粘贴并执行 `supabase/schema.sql`
4. 看到 `Success. No rows returned` 即表示执行成功

如果是已有线上数据库，请执行 `supabase/migrations/202604250001_harden_inventory_constraints.sql`。这个迁移会先检查是否存在跨用户分类引用或负金额脏数据；如果检查失败，需要先修复数据再执行迁移。

### 配置 Supabase Auth 回调

在 Supabase Dashboard 里打开：

```text
Authentication -> URL Configuration
```

本地开发至少需要：

```text
Site URL:
http://localhost:3000

Redirect URLs:
http://localhost:3000/auth/callback
```

如果已经部署到 Vercel，还需要加入线上地址，见下面的部署部分。

### 启动本地开发服务

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 7. 部署到 Vercel

### 推荐部署方式

推荐方式是：

```text
GitHub public repo -> Vercel Git Integration -> 自动部署
```

也就是说，本地或 GitHub 上的代码推送到 `main` 分支后，Vercel 自动拉取 GitHub 仓库并部署生产环境。

当前项目的 GitHub 仓库：

```text
https://github.com/Xr810/inventory-dashboard
```

当前线上应用地址：

```text
https://inventory-dashboard-flame.vercel.app
```

### Vercel 项目设置

在 Vercel 中导入 GitHub 仓库：

```text
Xr810/inventory-dashboard
```

推荐设置：

- Project Name: `inventory-dashboard`
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: 默认即可，通常是 `npm install`
- Output Directory: 默认即可
- Production Branch: `main`

### Vercel 环境变量

在 Vercel 项目中配置以下环境变量：

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_EMAIL
```

这些变量需要至少配置到：

- Production
- Preview

Production 用于 `main` 分支生产部署。Preview 用于非生产分支或 Pull Request 预览部署。

不要在 Vercel 中配置 Supabase `service_role` key，因为这个应用不需要它。

### Supabase Auth 线上回调配置

部署完成后，把 Vercel 域名加入 Supabase Auth 配置。

在 Supabase Dashboard：

```text
Authentication -> URL Configuration
```

设置：

```text
Site URL:
https://inventory-dashboard-flame.vercel.app
```

Redirect URLs 至少包含：

```text
https://inventory-dashboard-flame.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

保留 localhost 回调是为了本地开发还能使用 magic link 登录。

### 自动部署流程

以后改代码后，常规流程是：

```bash
git status
git add .
git commit -m "Describe the change"
git push origin main
```

推送完成后，Vercel 会自动触发生产部署。正常情况下不需要手动运行：

```bash
vercel deploy
```

只有在你想绕过 GitHub 直接部署当前本地目录时，才需要手动使用 Vercel CLI。

## 8. 验证清单

### 本地验证

```bash
npm run typecheck
npm run build
```

### GitHub 验证

确认这些文件没有进入仓库：

- `.env.local`
- `.vercel/`
- `node_modules/`
- `.next/`

确认没有提交：

- Supabase `service_role` key
- Supabase `sb_secret_...` key
- 任何个人密码或长期 token

### Vercel 验证

在 Vercel Deployments 页面确认：

- 构建成功
- Production URL 可打开
- 未登录访问首页会跳转到 `/login`
- 登录 magic link 能回到 `/auth/callback`

### 应用验证

登录后检查：

- 能进入 dashboard
- 默认分类能自动创建
- 能新增物品
- 能编辑物品
- 能删除物品
- 统计值会更新
- Markdown 能导入
- Markdown 能导出

## 9. 常见问题

### Supabase 要本地部署吗？

不需要。这个项目使用 Supabase 云端项目。本地只运行 Next.js 开发服务，数据库和登录都在 Supabase 云端。

### Vercel 是不是只能放前端？

不是。这个项目部署到 Vercel 的是完整 Next.js 应用，包括页面、Server Actions、路由处理和中间件。但数据库不放在 Vercel，数据库放在 Supabase。

### GitHub public repo 安全吗？

可以公开代码，但不要公开密钥和个人数据。当前设计中：

- `.env.local` 被 `.gitignore` 忽略
- Supabase secret key 不需要出现在代码里
- 数据保存在 Supabase，不在 GitHub
- RLS 限制用户只能访问自己的数据

### 为什么不用 Obsidian 双向同步？

因为 Vercel 线上应用无法直接访问你 Mac 本地的 Obsidian vault 文件路径。为了避免复杂且不稳定的本机同步机制，首版采用更清晰的方式：Supabase 是主数据源，Obsidian 使用 Markdown 导入和导出备份。
