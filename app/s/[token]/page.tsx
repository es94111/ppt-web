import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isShareLinkActive, shareAccessCookieName, verifyShareAccessToken } from "@/lib/share-links";
import { SharePassword } from "@/components/SharePassword";
import { Viewer } from "@/components/Viewer";
import "@/app/viewer.css";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({
    where: { token },
    include: { deck: { include: { slides: { orderBy: { order: "asc" } } } } },
  });
  if (!link || !isShareLinkActive(link) || link.deck.status !== "READY") notFound();
  const accessToken = (await cookies()).get(shareAccessCookieName(token))?.value;
  if (link.passwordHash && !verifyShareAccessToken(token, accessToken)) return <main><SharePassword token={token} title={link.deck.title} /></main>;
  return <main><Viewer deckId={link.deck.id} title={link.deck.title} exitHref="/" downloadHref={link.allowDownload ? `/s/${token}/pdf` : undefined} slides={link.deck.slides.map((slide) => ({ id: slide.id, order: slide.order, content: slide.content, notes: slide.notes }))} /></main>;
}
