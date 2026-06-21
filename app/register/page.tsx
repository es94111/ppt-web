import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canCreatePublicAccount } from "@/lib/site-settings";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function Register() {
  if (await auth()) redirect("/dashboard");
  const registrationOpen = await canCreatePublicAccount();
  return <main className="auth-wrap"><div className="auth-card">
    <h1>建立帳號</h1>
    {registrationOpen ? <>
      <p className="muted">第一位註冊者將成為系統管理員。</p>
      <AuthForm mode="register" googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />
    </> : <><p className="muted">管理員目前未開放公開註冊。</p><Link className="btn" style={{ width: "100%" }} href="/login">返回登入</Link></>}
    <p className="muted" style={{ textAlign: "center" }}>已有帳號？ <Link href="/login" style={{ color: "var(--brand)" }}>登入</Link></p>
  </div></main>;
}
