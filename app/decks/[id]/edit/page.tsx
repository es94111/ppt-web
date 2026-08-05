import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { brandKitFromDeck } from "@/lib/brand";
import { Editor } from "@/components/Editor";
import { PptxEditor } from "@/components/PptxEditor";
import { joinSlidesToMarkdown } from "@/lib/slides";
import "@/app/editor.css";

export const dynamic = "force-dynamic";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, include: { slides: { orderBy: { order: "asc" } }, collaborators: { where: { userId: session.user.id }, select: { role: true } }, tags: { include: { tag: true } } } });
  if (!deck) notFound();
  const canEdit = session.user.role === "ADMIN" || deck.ownerId === session.user.id || deck.collaborators[0]?.role === "EDITOR";
  const canManage = session.user.role === "ADMIN" || deck.ownerId === session.user.id;
  if (!canEdit) redirect("/dashboard");
  if (session.user.role === "GUEST") redirect(`/d/${id}`);
  if (deck.sourceType === "PPTX") {
    // 舊資料可能只有轉出的圖片、沒有原始檔；這類簡報仍維持既有唯讀播放器。
    if (!deck.sourceFile) redirect(`/d/${id}`);
    return <main><PptxEditor deck={{ id: deck.id, title: deck.title, sourceUrl: `/api/decks/${id}/pptx`, fileName: `${deck.title}.pptx`, canManage }} /></main>;
  }
  const initialMarkdown = joinSlidesToMarkdown(deck.slides);
  return (
    <main>
      <Editor deck={{ id: deck.id, title: deck.title, description: deck.description, visibility: deck.visibility, hasPassword: !!deck.passwordHash, initialMarkdown, category: deck.category, tags: deck.tags.map((item) => item.tag.name), slides: deck.slides.map((slide) => ({ id: slide.id, order: slide.order })), canManage, brandKit: brandKitFromDeck(deck) }} />
    </main>
  );
}
