import Link from "next/link";
import { Presentation } from "lucide-react";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// 公開簡報藝廊：任何人（含未登入匿名）皆可瀏覽全部公開簡報。
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().slice(0, 100);
  const sort = sp.sort === "popular" ? "popular" : "recent";
  const decks = await db.deck.findMany({
    where: { visibility: "PUBLIC", status: "READY", ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    select: { id: true, title: true, description: true, sourceType: true, owner: { select: { name: true } }, _count: { select: { slides: true, viewLogs: true } } },
    orderBy: sort === "popular" ? { viewLogs: { _count: "desc" } } : { updatedAt: "desc" },
    take: 60,
  });
  return (
    <main>
      <section className="container section">
        <div className="section-head">
          <div><h1>探索公開簡報</h1><p className="muted">瀏覽所有公開分享的簡報，不需登入即可觀看。</p></div>
        </div>
        <form className="filter-bar" method="get">
          <input className="input" type="search" name="q" defaultValue={q} placeholder="搜尋標題…" maxLength={100} />
          <select className="input" name="sort" defaultValue={sort}>
            <option value="recent">最新</option>
            <option value="popular">最熱門</option>
          </select>
          <button className="btn small">搜尋</button>
        </form>
        {decks.length ? (
          <div className="grid">
            {decks.map((d) => (
              <article className="card deck-card" key={d.id}>
                <Link href={`/d/${d.id}`}><div className="deck-cover"><Presentation size={48} /></div></Link>
                <div className="deck-body">
                  <div className="deck-meta"><span className="badge">{d.sourceType === "PPTX" ? "PPTX" : "Markdown"}</span><span>{d._count.slides} 頁 · {d._count.viewLogs} 次瀏覽</span></div>
                  <h3>{d.title}</h3>
                  <p className="muted">{d.description || `由 ${d.owner.name || "未具名"} 建立`}</p>
                  <div className="actions"><Link className="btn small" href={`/d/${d.id}`}>播放</Link></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty"><Presentation size={42} /><h3>{q ? "找不到符合的公開簡報" : "目前還沒有公開簡報"}</h3></div>
        )}
      </section>
    </main>
  );
}
