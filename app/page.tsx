import Link from "next/link";
import { Presentation } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SlideView } from "@/components/SlideView";
import { FavoriteButton } from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

// 首頁即公開簡報藝廊：任何人（含未登入匿名）皆可瀏覽全部公開簡報。
export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; category?: string; tag?: string }> }) {
  const [session, sp] = await Promise.all([auth(), searchParams]);
  const q = (sp.q || "").trim().slice(0, 100);
  const sort = sp.sort === "popular" ? "popular" : "recent";
  const category = (sp.category || "").trim().slice(0, 40);
  const tag = (sp.tag || "").trim().slice(0, 48);
  const where = {
    visibility: { in: ["PUBLIC" as const, "PASSWORD" as const] },
    status: "READY" as const,
    ...(category ? { category } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } }] } : {}),
  };
  const [decks, categories, tags] = await Promise.all([
    db.deck.findMany({
    where,
    select: { id: true, title: true, description: true, sourceType: true, passwordHash: true, category: true, owner: { select: { id: true, name: true } }, tags: { include: { tag: true } }, favorites: { where: { userId: session?.user.id ?? "__anonymous__" }, select: { id: true } }, _count: { select: { slides: true, viewLogs: true, favorites: true } }, slides: { orderBy: { order: "asc" }, take: 1, select: { content: true } } },
    orderBy: sort === "popular" ? { viewLogs: { _count: "desc" } } : { updatedAt: "desc" },
    take: 60,
    }),
    db.deck.findMany({ where: { visibility: { in: ["PUBLIC", "PASSWORD"] }, status: "READY", category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    db.tag.findMany({ where: { decks: { some: { deck: { visibility: { in: ["PUBLIC", "PASSWORD"] }, status: "READY" } } } }, orderBy: { name: "asc" }, take: 30 }),
  ]);
  return (
    <main>
      <section className="container section">
        <div className="section-head">
          <div><h1>探索公開簡報</h1><p className="muted">瀏覽所有公開分享的簡報，不需登入即可觀看。</p></div>
          <Link className="btn" href={session ? "/dashboard" : "/register"}>{session ? "進入工作區" : "建立第一份簡報"}</Link>
        </div>
        <form className="filter-bar" method="get">
          <input className="input" type="search" name="q" defaultValue={q} placeholder="搜尋標題…" maxLength={100} aria-label="搜尋簡報標題" />
          <select className="input" name="sort" defaultValue={sort} aria-label="排序方式">
            <option value="recent">最新</option>
            <option value="popular">最熱門</option>
          </select>
          <select className="input" name="category" defaultValue={category} aria-label="分類">
            <option value="">所有分類</option>
            {categories.map((item) => item.category && <option value={item.category} key={item.category}>{item.category}</option>)}
          </select>
          <select className="input" name="tag" defaultValue={tag} aria-label="標籤">
            <option value="">所有標籤</option>
            {tags.map((item) => <option value={item.slug} key={item.id}>#{item.name}</option>)}
          </select>
          <button className="btn small">搜尋</button>
        </form>
        {decks.length ? (
          <div className="grid">
            {decks.map((d) => (
              <article className="card deck-card" key={d.id}>
                <Link href={`/d/${d.id}`}><div className="deck-cover">{d.slides?.[0] ? <SlideView content={d.slides[0].content} /> : <Presentation size={48} />}</div></Link>
                <div className="deck-body">
                  <div className="deck-meta"><span className="badge">{d.passwordHash ? "密碼保護" : d.sourceType === "PPTX" ? "PPTX" : "Markdown"}</span><span>{d._count.slides} 頁 · {d._count.viewLogs} 次瀏覽 · {d._count.favorites} 收藏</span></div>
                  <h3>{d.title}</h3>
                  <p className="muted">{d.description || "尚無描述"}</p>
                  <p className="muted deck-author">由 <Link href={`/authors/${d.owner.id}`}>{d.owner.name || "未具名"}</Link>{d.category ? ` · ${d.category}` : ""}</p>
                  {d.tags.length > 0 && <div className="tag-row">{d.tags.map((item) => <Link className="tag-chip" href={`/?tag=${item.tag.slug}`} key={item.tagId}>#{item.tag.name}</Link>)}</div>}
                  <div className="actions"><Link className="btn small" href={`/d/${d.id}`}>播放</Link>{session?.user && <FavoriteButton deckId={d.id} initialFavorite={d.favorites.length > 0} />}</div>
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
