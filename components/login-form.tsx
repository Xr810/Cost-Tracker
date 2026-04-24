"use client";

import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("登录链接已发送，请检查邮箱。");
    });
  }

  return (
    <form onSubmit={submitLogin} className="import-export">
      <div className="field">
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          name="email"
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "发送中..." : "发送登录链接"}
      </button>
      {message ? <p className={message.includes("已发送") ? "subtle" : "error"}>{message}</p> : null}
    </form>
  );
}
