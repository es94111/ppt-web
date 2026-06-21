import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { AdminUsers } from "@/components/AdminUsers";
import { RegistrationSettings } from "@/components/RegistrationSettings";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1));
  const where = query.search ? { OR: [{ email: { contains: query.search, mode: "insensitive" as const } }, { name: { contains: query.search, mode: "insensitive" as const } }] } : {};
  const [users, total, settings] = await Promise.all([
    db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30 }),
    db.user.count({ where }),
    getSiteSettings(),
  ]);

  return <main><section className="container section">
    <div className="section-head"><div><h1>使用者管理</h1><p className="muted">指派角色並控制帳號存取，共 {total} 個帳號。</p></div><Link className="btn secondary" href="/admin/logs">瀏覽稽核</Link></div>
    <RegistrationSettings initialValue={settings.allowPublicRegistration} />
    <form className="filter-bar"><input className="input" name="search" placeholder="搜尋名稱或 Email" defaultValue={query.search} /><button className="btn small">搜尋</button>{query.search && <Link className="btn secondary small" href="/admin/users">清除</Link>}</form>
    <AdminUsers users={users} currentId={session.user.id} />
    {total > 30 && <div className="pagination">{page > 1 && <Link className="btn secondary small" href={`?page=${page - 1}&search=${encodeURIComponent(query.search ?? "")}`}>上一頁</Link>}<span>{page} / {Math.ceil(total / 30)}</span>{page * 30 < total && <Link className="btn secondary small" href={`?page=${page + 1}&search=${encodeURIComponent(query.search ?? "")}`}>下一頁</Link>}</div>}
  </section></main>;
}
