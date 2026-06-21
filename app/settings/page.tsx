import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const linkedGoogle = await db.account.findFirst({ where: { userId: session.user.id, provider: "google" }, select: { id: true } });
  return <main><section className="container section">
    <div className="section-head"><div><h1>個人設定</h1><p className="muted">管理顯示名稱與帳號資訊。</p></div></div>
    <SettingsForm name={session.user.name ?? ""} email={session.user.email ?? ""} role={session.user.role} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} googleLinked={!!linkedGoogle} />
  </section></main>;
}
