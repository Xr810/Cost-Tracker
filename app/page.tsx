import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/dashboard";
import { isAllowedAdmin } from "@/lib/auth";
import { ensureDefaultCategories, getInventoryData } from "@/lib/data";
import { hasSupabaseConfig } from "@/lib/env";

export default async function Home() {
  if (!hasSupabaseConfig()) {
    return <SetupNotice />;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedAdmin(user.email)) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">访问受限</p>
          <h1>这个后台只允许管理员使用</h1>
          <p className="subtle">
            当前登录账号不在 <code>ADMIN_EMAIL</code> 允许范围内。请切换账号或更新 Vercel
            环境变量。
          </p>
        </section>
      </main>
    );
  }

  await ensureDefaultCategories(user.id);
  const data = await getInventoryData(user.id);

  return <Dashboard initialData={data} userEmail={user.email ?? ""} />;
}

function SetupNotice() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Supabase Cloud Setup</p>
        <h1>先连接 Supabase 云端项目</h1>
        <p className="subtle">
          这个应用不会在本地部署数据库。请在 Supabase 免费云端项目里执行
          <code> supabase/schema.sql </code>，然后把项目 URL、匿名 key 和管理员邮箱填入
          <code> .env.local </code>。
        </p>
        <pre className="notice">{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_EMAIL=你的邮箱`}</pre>
      </section>
    </main>
  );
}
