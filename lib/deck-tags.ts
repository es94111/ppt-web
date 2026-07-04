import { db } from "@/lib/db";
import { parseTags } from "@/lib/tags";

export async function replaceDeckTags(deckId: string, input: unknown) {
  const tags = parseTags(input);
  await db.deckTag.deleteMany({ where: { deckId } });
  if (!tags.length) return;
  for (const tag of tags) {
    const record = await db.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { name: tag.name, slug: tag.slug },
      select: { id: true },
    });
    await db.deckTag.create({ data: { deckId, tagId: record.id } }).catch(() => undefined);
  }
}
