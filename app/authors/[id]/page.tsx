import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SlideView } from "@/components/SlideView";
import { FavoriteButton } from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  const author = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
  if (!author) notFound();
  const decks = await db.deck.findMany({
    where: { ownerId: id, visibility: { in: ["PUBLIC", "PASSWORD"] }, status: "READY" },
    select: { id: true, title: true, description: true, passwordHash: true, category: true, tags: { include: { tag: true } }, favorites: { where: { userId: session?.user.id ?? "__anonymous__" }, select: { id: true } }, _count: { select: { slides: true, viewLogs: true, favorites: true } }, slides: { orderBy: { order: "asc" }, take: 1, select: { content: true } } },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return <main><section className="container section"><div className="section-head"><div><h1>{author.name || author.email} 的公開簡報</h1><p className="muted">共 {decks.length} 份公開分享。</p></div><Link className="btn secondary" href="/">回到探索</Link></div>{decks.length ? <div className="grid">{decks.map((deck) => <article className="card deck-card" key={deck.id}><Link href={`/d/${deck.id}`}><div className="deck-cover">{deck.slides[0] ? <SlideView content={deck.slides[0].content} /> : <Presentation size={48} />}</div></Link><div className="deck-body"><div className="deck-meta"><span className="badge">{deck.passwordHash ? "密碼保護" : "Markdown"}</span><span>{deck._count.slides} 頁 · {deck._count.viewLogs} 次瀏覽 · {deck._count.favorites} 收藏</span></div><h3>{deck.title}</h3><p className="muted">{deck.description || deck.category || "尚無描述"}</p>{deck.tags.length > 0 && <div className="tag-row">{deck.tags.map((item) => <Link className="tag-chip" href={`/?tag=${item.tag.slug}`} key={item.tagId}>#{item.tag.name}</Link>)}</div>}<div className="actions"><Link className="btn small" href={`/d/${deck.id}`}>播放</Link>{session?.user && <FavoriteButton deckId={deck.id} initialFavorite={deck.favorites.length > 0} />}</div></div></article>)}</div> : <div className="empty"><Presentation size={42} /><h3>目前沒有公開簡報</h3></div>}</section></main>;
}
