import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isShareLinkActive, shareAccessCookieName, verifyShareAccessToken } from "@/lib/share-links";
import { PrintButton } from "@/components/PrintButton";
import { SharePassword } from "@/components/SharePassword";
import { SlideView } from "@/components/SlideView";
import "@/app/export.css";

export const dynamic = "force-dynamic";

export default async function SharedPdfPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({
    where: { token },
    include: { deck: { include: { slides: { orderBy: { order: "asc" } } } } },
  });
  if (!link || !isShareLinkActive(link) || !link.allowDownload || link.deck.status !== "READY") notFound();
  const accessToken = (await cookies()).get(shareAccessCookieName(token))?.value;
  if (link.passwordHash && !verifyShareAccessToken(token, accessToken)) return <main><SharePassword token={token} title={link.deck.title} /></main>;
  return (
    <main className="export-page">
      <div className="export-toolbar">
        <div className="container export-toolbar-inner">
          <div><h1>{link.deck.title} — PDF 匯出</h1><p className="muted">此分享連結允許下載。</p></div>
          <div className="export-actions"><Link className="btn secondary small" href={`/s/${token}`}>返回播放</Link><PrintButton /></div>
        </div>
      </div>
      <section className="print-deck">{link.deck.slides.map((slide) => <article className="print-slide" key={slide.id}><SlideView content={slide.content} /></article>)}</section>
    </main>
  );
}
