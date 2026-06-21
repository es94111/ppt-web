import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const query = await searchParams;
  const callbackUrl = query.callbackUrl?.startsWith("/") && !query.callbackUrl.startsWith("//") ? query.callbackUrl : "/dashboard";
  if (await auth()) redirect(callbackUrl);
  return <main className="auth-wrap"><div className="auth-card">
    <h1>歡迎回來</h1><p className="muted">登入以繼續管理你的簡報。</p>
    <AuthForm mode="login" googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} callbackUrl={callbackUrl} />
    <p className="muted" style={{ textAlign: "center" }}>還沒有帳號？ <Link href="/register" style={{ color: "var(--brand)" }}>立即註冊</Link></p>
  </div></main>;
}
