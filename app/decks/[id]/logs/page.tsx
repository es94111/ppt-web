import Link from "next/link";
import { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getShareLinkAnalytics } from "@/lib/share-analytics";

export const dynamic = "force-dynamic";

function sourceLabel(referer: string | null) {
  if (!referer) return "直接進入";
  try {
    const url = new URL(referer);
    return url.hostname.replace(/^www\./, "") || "未知來源";
  } catch {
    return "未知來源";
  }
}

export default async function DeckLogsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; ip?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, select: { id: true, title: true, ownerId: true, _count: { select: { slides: true } } } });
  if (!deck) notFound();
  if (session.user.role !== "ADMIN" && deck.ownerId !== session.user.id) redirect("/dashboard");

  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1));
  const tableWhere: Prisma.ViewLogWhereInput = { deckId: id, ...(query.ip ? { ipAddress: { contains: query.ip.slice(0, 64) } } : {}) };
  const analyticsWhere: Prisma.ViewLogWhereInput = { deckId: id };
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [logs, total, uniqueRows, slideGroups, recentReferers, dailyRows, shareLinks] = await db.$transaction([
    db.viewLog.findMany({ where: tableWhere, include: { user: { select: { name: true, email: true } }, shareLink: { select: { label: true, token: true } } }, orderBy: { viewedAt: "desc" }, skip: (page - 1) * 50, take: 50 }),
    db.viewLog.count({ where: tableWhere }),
    db.viewLog.groupBy({ by: ["userId", "ipAddress"], where: analyticsWhere }),
    db.viewLog.groupBy({ by: ["slideOrder"], where: { deckId: id, slideOrder: { not: null } }, _count: { _all: true } }),
    db.viewLog.findMany({ where: analyticsWhere, select: { referer: true }, orderBy: { viewedAt: "desc" }, take: 1000 }),
    db.$queryRaw<Array<{ day: Date; views: number }>>(Prisma.sql`
      SELECT date_trunc('day', "viewedAt")::date AS day, count(*)::int AS views
      FROM "ViewLog"
      WHERE "deckId" = ${id} AND "viewedAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `),
    db.shareLink.findMany({ where: { deckId: id }, select: { id: true, token: true, label: true, expiresAt: true, revokedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const shareAnalytics = await getShareLinkAnalytics(id, shareLinks.map((link) => link.id), deck._count.slides);

  const uniqueVisitors = new Set(uniqueRows.map((row) => row.userId ? `u:${row.userId}` : `ip:${row.ipAddress}`)).size;
  const dailyMap = new Map(dailyRows.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.views)]));
  const trend = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    return { key, label: day.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }), views: dailyMap.get(key) ?? 0 };
  });
  const maxTrend = Math.max(1, ...trend.map((item) => item.views));

  const slideMap = new Map(slideGroups.filter((row) => row.slideOrder !== null).map((row) => [row.slideOrder!, row._count._all]));
  const slideStats = Array.from({ length: deck._count.slides }, (_, i) => ({ order: i + 1, views: slideMap.get(i + 1) ?? 0 }));
  const maxSlideViews = Math.max(1, ...slideStats.map((slide) => slide.views));
  const hotSlides = [...slideStats].sort((a, b) => b.views - a.views).slice(0, 5);
  const dropOff = slideStats.slice(1).map((slide, i) => ({ from: i + 1, to: slide.order, drop: Math.max(0, slideStats[i].views - slide.views) })).sort((a, b) => b.drop - a.drop)[0];

  const sourceCounts = new Map<string, number>();
  for (const row of recentReferers) sourceCounts.set(sourceLabel(row.referer), (sourceCounts.get(sourceLabel(row.referer)) ?? 0) + 1);
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const backHref = `/decks/${id}/edit`;
  return (
    <main>
      <section className="container section">
        <div className="section-head">
          <div><h1>{deck.title} — 瀏覽分析</h1><p className="muted">共 {total} 次符合篩選的瀏覽事件，整體累計 {uniqueVisitors} 位唯一訪客。</p></div>
          <Link className="btn secondary" href={backHref}>返回</Link>
        </div>

        <div className="analytics-grid">
          <article className="metric-card"><span>瀏覽事件</span><strong>{total}</strong><small>目前篩選條件</small></article>
          <article className="metric-card"><span>唯一訪客</span><strong>{uniqueVisitors}</strong><small>依登入者或匿名 IP 去重</small></article>
          <article className="metric-card"><span>熱門投影片</span><strong>{hotSlides[0]?.views ? `第 ${hotSlides[0].order} 頁` : "尚無"}</strong><small>{hotSlides[0]?.views ?? 0} 次瀏覽</small></article>
          <article className="metric-card"><span>可能流失</span><strong>{dropOff?.drop ? `第 ${dropOff.from}→${dropOff.to} 頁` : "穩定"}</strong><small>{dropOff?.drop ? `少了 ${dropOff.drop} 次瀏覽` : "暫無明顯落差"}</small></article>
        </div>

        <div className="analytics-panels">
          <article className="analytics-panel trend-panel">
            <h2>近 14 天趨勢</h2>
            <div className="trend-chart">
              {trend.map((day) => <div className="trend-day" key={day.key}><div style={{ height: `${Math.max(4, day.views / maxTrend * 100)}%` }} /><span>{day.label}</span><strong>{day.views}</strong></div>)}
            </div>
          </article>
          <article className="analytics-panel">
            <h2>熱門投影片</h2>
            <div className="rank-list">
              {hotSlides.map((slide) => <div className="rank-row" key={slide.order}><span>第 {slide.order} 頁</span><div><i style={{ width: `${slide.views / maxSlideViews * 100}%` }} /></div><strong>{slide.views}</strong></div>)}
            </div>
          </article>
          <article className="analytics-panel">
            <h2>來源統計</h2>
            <div className="source-list">
              {topSources.length ? topSources.map(([source, count]) => <div key={source}><span>{source}</span><strong>{count}</strong></div>) : <p className="muted">尚無來源資料</p>}
            </div>
          </article>
        </div>

        <div className="analytics-subhead"><h2>分享連結成效</h2><p className="muted">依每組 token 比較觀看次數、完成率與可能流失位置。</p></div>
        <div className="table-wrap link-analytics-table"><table><thead><tr><th>分享連結</th><th>狀態</th><th>觀看</th><th>訪客</th><th>完成率</th><th>流失頁</th><th>最後觀看</th></tr></thead><tbody>{shareLinks.length ? shareLinks.map((link) => {
          const analytics = shareAnalytics.get(link.id);
          const active = !link.revokedAt && (!link.expiresAt || link.expiresAt.getTime() > Date.now());
          return <tr key={link.id}><td><Link href={`/s/${link.token}`} target="_blank">{link.label || "未命名連結"}</Link></td><td>{active ? "有效" : "已失效"}</td><td>{analytics?.viewCount ?? 0}</td><td>{analytics?.uniqueVisitors ?? 0}</td><td>{analytics?.completionRate ?? 0}%</td><td>{analytics?.dropOffSlide ? `第 ${analytics.dropOffSlide} 頁後（${analytics.dropOffCount}）` : "—"}</td><td>{analytics?.lastViewedAt ? analytics.lastViewedAt.toLocaleString("zh-TW") : "—"}</td></tr>;
        }) : <tr><td colSpan={7}>尚未建立分享連結</td></tr>}</tbody></table></div>

        <form className="filter-bar">
          <input className="input" name="ip" placeholder="篩選 IP" defaultValue={query.ip} />
          <button className="btn small">篩選</button>
          <Link className="btn secondary small" href={`/decks/${id}/logs`}>清除</Link>
        </form>
        <div className="table-wrap"><table><thead><tr><th>時間</th><th>使用者</th><th>頁碼</th><th>分享</th><th>IP</th><th>來源</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{log.viewedAt.toLocaleString("zh-TW")}</td><td>{log.user?.name || log.user?.email || "匿名"}</td><td>{log.slideOrder ?? "—"}</td><td>{log.shareLink ? <Link href={`/s/${log.shareLink.token}`} target="_blank">{log.shareLink.label || "未命名"}</Link> : "—"}</td><td>{log.ipAddress}</td><td className="truncate-cell">{log.referer || "—"}</td></tr>)}</tbody></table></div>
        {total > 50 && <div className="pagination">{page > 1 && <Link className="btn secondary small" href={`?page=${page - 1}&ip=${encodeURIComponent(query.ip ?? "")}`}>上一頁</Link>}<span>{page} / {Math.ceil(total / 50)}</span>{page * 50 < total && <Link className="btn secondary small" href={`?page=${page + 1}&ip=${encodeURIComponent(query.ip ?? "")}`}>下一頁</Link>}</div>}
      </section>
    </main>
  );
}
