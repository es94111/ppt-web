import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Editor } from "@/components/Editor";
import { joinSlidesToMarkdown } from "@/lib/slides";
import "@/app/editor.css";

export const dynamic = "force-dynamic";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, include: { slides: { orderBy: { order: "asc" } } } });
  if (!deck) notFound();
  if (session.user.role !== "ADMIN" && deck.ownerId !== session.user.id) redirect("/dashboard");
  if (session.user.role === "GUEST") redirect(`/d/${id}`);
  // PPTX 匯入的簡報為唯讀，沒有編輯器，導向播放器
  if (deck.sourceType === "PPTX") redirect(`/d/${id}`);
  const initialMarkdown = joinSlidesToMarkdown(deck.slides.map((s) => s.content));
  return (
    <main>
      <Editor deck={{ id: deck.id, title: deck.title, description: deck.description, visibility: deck.visibility, initialMarkdown }} />
    </main>
  );
}
