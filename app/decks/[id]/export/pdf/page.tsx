import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { brandKitFromDeck } from "@/lib/brand";
import { PrintButton } from "@/components/PrintButton";
import { SlideView } from "@/components/SlideView";
import "@/app/export.css";

export const dynamic = "force-dynamic";

export default async function PdfExportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, include: { slides: { orderBy: { order: "asc" } }, collaborators: { where: { userId: session.user.id }, select: { role: true } } } });
  if (!deck) notFound();
  if (session.user.role !== "ADMIN" && deck.ownerId !== session.user.id && !deck.collaborators.length) redirect("/dashboard");
  if (session.user.role === "GUEST") redirect(`/d/${id}`);

  return (
    <main className="export-page">
      <div className="export-toolbar">
        <div className="container export-toolbar-inner">
          <div><h1>{deck.title} — PDF 匯出</h1><p className="muted">每張投影片會以 16:9 橫向頁面列印。</p></div>
          <div className="export-actions"><Link className="btn secondary small" href={`/decks/${id}/edit`}>返回</Link><PrintButton /></div>
        </div>
      </div>
      <section className="print-deck">
        {deck.slides.map((slide) => <article className="print-slide" key={slide.id}><SlideView content={slide.content} brandKit={brandKitFromDeck(deck)} /></article>)}
      </section>
    </main>
  );
}
