import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { hasAdminEmailConfig } from "@/lib/auth";

export default async function LoginPage() {
  if (!hasSupabaseConfig() || !hasAdminEmailConfig()) {
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Inventory Admin</p>
        <h1>登录你的物品资产后台</h1>
        <p className="subtle">
          输入管理员邮箱，Supabase 会发送一次性登录链接。首版只允许配置在
          <code> ADMIN_EMAIL </code>里的账号进入。
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
