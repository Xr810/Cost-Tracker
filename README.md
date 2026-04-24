# 个人物品资产管理

一个部署到 Vercel 的个人物品资产管理后台。Next.js 负责界面和服务端动作，Supabase 负责登录、数据库和 RLS 权限。

## 本地运行

1. 复制 `.env.example` 为 `.env.local`
2. 填入 Supabase 项目 URL、匿名 key 和你的管理员邮箱
3. 在 Supabase SQL Editor 执行 `supabase/schema.sql`
4. 运行：

```bash
npm install
npm run dev
```

## 环境变量

见 `.env.example`。

## 详细说明和部署

见 `docs/APP_AND_DEPLOYMENT.md`。
