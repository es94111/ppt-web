import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyDeckAccessToken } from "@/lib/http";
import { DeckPassword } from "@/components/DeckPassword";
import { Viewer } from "@/components/Viewer";
import "@/app/viewer.css";

export const dynamic = "force-dynamic";
export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, include: { slides: { orderBy: { order: "asc" } } } });
  if (!deck) notFound();
  const owns = !!session?.user && (session.user.role === "ADMIN" || deck.ownerId === session.user.id);
  // 私人：須登入且為擁有者/Admin
  if (deck.visibility === "PRIVATE" && !owns) redirect(session?.user ? "/dashboard" : "/login");
  // 公開簡報可額外設定密碼；擁有者與管理員可直接觀看。
  const accessToken = (await cookies()).get(`deck_access_${id}`)?.value;
  if (deck.passwordHash && !owns && !verifyDeckAccessToken(id, accessToken)) return <main><DeckPassword deckId={id} title={deck.title} /></main>;
  // PUBLIC / UNLISTED → 允許匿名瀏覽
  if (deck.status !== "READY") {
    const text = deck.status === "PROCESSING" ? "PPTX 轉檔中，請稍後重新整理。" : "PPTX 轉檔失敗，請重新上傳。";
    return <main><section className="container section"><div className="empty"><h3>{deck.title}</h3><p>{text}</p></div></section></main>;
  }
  return <main><Viewer deckId={id} title={deck.title} slides={deck.slides.map((s) => ({ id: s.id, order: s.order, content: s.content }))} /></main>;
}
