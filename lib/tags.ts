export function normalizeTagName(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 32);
}

export function tagSlug(input: string) {
  return normalizeTagName(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseTags(input: unknown) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const tags: { name: string; slug: string }[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const name = normalizeTagName(item);
    const slug = tagSlug(name);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ name, slug });
    if (tags.length >= 8) break;
  }
  return tags;
}
