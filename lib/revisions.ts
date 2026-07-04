import { db } from "@/lib/db";
import { parseMarkdownDeck } from "@/lib/slides";

const REVISION_INTERVAL_MS = 5 * 60 * 1000;
const MAX_REVISIONS = 50;

export async function maybeCreateDeckRevision({
  deckId,
  authorId,
  title,
  markdown,
  force = false,
}: {
  deckId: string;
  authorId?: string | null;
  title: string;
  markdown: string;
  force?: boolean;
}) {
  const normalized = markdown.trim();
  if (!normalized) return null;

  const last = await db.deckRevision.findFirst({
    where: { deckId },
    orderBy: { createdAt: "desc" },
    select: { id: true, markdown: true, createdAt: true },
  });
  const due = !last || Date.now() - last.createdAt.getTime() >= REVISION_INTERVAL_MS;
  if (!force && (!due || last?.markdown === normalized)) return null;

  const revision = await db.deckRevision.create({
    data: {
      deckId,
      authorId: authorId ?? null,
      title,
      markdown: normalized,
      slideCount: parseMarkdownDeck(normalized).length,
    },
    select: { id: true, createdAt: true },
  });

  const stale = await db.deckRevision.findMany({
    where: { deckId },
    orderBy: { createdAt: "desc" },
    skip: MAX_REVISIONS,
    select: { id: true },
  });
  if (stale.length) await db.deckRevision.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  return revision;
}
