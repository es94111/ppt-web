import { describe, expect, it } from "vitest";
import { brandKitSchema, deckAiSchema, deckUpdateSchema, registerSchema, shareLinkCreateSchema, slideContentSchema } from "./schemas";
import { generateDeckAiText } from "./ai-assistant";
import { splitMarkdownSlides, joinSlidesToMarkdown, parseMarkdownDeck } from "./slides";
import { rateLimit } from "./rate-limit";

describe("slideContentSchema", () => {
  it("accepts a markdown slide (raw text; sanitisation happens at render)", () =>
    expect(slideContentSchema.safeParse({ kind: "markdown", markdown: "# Hi\n\n<script>alert(1)</script>" }).success).toBe(true));
  it("accepts an image slide", () =>
    expect(slideContentSchema.safeParse({ kind: "image", src: "https://x/y.png", alt: "p" }).success).toBe(true));
  it("rejects unknown kind and extra fields", () => {
    expect(slideContentSchema.safeParse({ kind: "shape", x: 0 }).success).toBe(false);
    expect(slideContentSchema.safeParse({ kind: "markdown", markdown: "x", evil: true }).success).toBe(false);
    expect(slideContentSchema.safeParse({ kind: "image", src: "" }).success).toBe(false);
  });
});

describe("splitMarkdownSlides", () => {
  it("splits on standalone --- lines", () =>
    expect(splitMarkdownSlides("a\n\n---\n\nb\n\n---\n\nc")).toEqual(["a", "b", "c"]));
  it("returns at least one slide", () => expect(splitMarkdownSlides("")).toEqual([""]));
  it("round-trips through join", () => {
    const parts = splitMarkdownSlides("# one\n\n---\n\n## two");
    const joined = joinSlidesToMarkdown(parts.map((m) => ({ kind: "markdown", markdown: m })));
    expect(splitMarkdownSlides(joined)).toEqual(parts);
  });
  it("extracts speaker notes with standalone ???", () => {
    expect(parseMarkdownDeck("# one\n\n???\nread this\n\n---\n\n## two")).toEqual([
      { markdown: "# one", notes: "read this" },
      { markdown: "## two", notes: null },
    ]);
  });
  it("round-trips notes through join", () => {
    const joined = joinSlidesToMarkdown([{ content: { kind: "markdown", markdown: "# one" }, notes: "talk track" }]);
    expect(parseMarkdownDeck(joined)).toEqual([{ markdown: "# one", notes: "talk track" }]);
  });
});

describe("registerSchema", () =>
  it("enforces password complexity", () =>
    expect(registerSchema.safeParse({ name: "A", email: "a@example.com", password: "alllowercase1" }).success).toBe(false)));

describe("password-protected sharing schemas", () => {
  it("requires new deck and share passwords to be at least 10 characters", () => {
    expect(deckUpdateSchema.safeParse({ password: "123456789" }).success).toBe(false);
    expect(deckUpdateSchema.safeParse({ password: "1234567890" }).success).toBe(true);
    expect(shareLinkCreateSchema.safeParse({ password: "123456789", allowDownload: false }).success).toBe(false);
    expect(shareLinkCreateSchema.safeParse({ password: "1234567890", allowDownload: false }).success).toBe(true);
  });
});

describe("brandKitSchema", () => {
  it("accepts safe brand settings", () =>
    expect(brandKitSchema.safeParse({ name: "Acme", logoUrl: "/logo.png", primaryColor: "#2563eb", accentColor: "#f59e0b", font: "display", footer: "Confidential" }).success).toBe(true));
  it("rejects unsafe logo URLs and malformed colors", () => {
    expect(brandKitSchema.safeParse({ logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(brandKitSchema.safeParse({ primaryColor: "blue" }).success).toBe(false);
  });
});

describe("deckAiSchema", () => {
  it("accepts valid AI actions", () =>
    expect(deckAiSchema.safeParse({ action: "draft", input: "AI 簡報助理", slideCount: 6 }).success).toBe(true));
  it("rejects unknown AI actions", () =>
    expect(deckAiSchema.safeParse({ action: "delete everything" }).success).toBe(false));
});

describe("generateDeckAiText", () => {
  it("falls back locally when no model is configured", async () => {
    const oldKey = process.env.AI_API_KEY;
    const oldOpenAiKey = process.env.OPENAI_API_KEY;
    const oldModel = process.env.AI_MODEL;
    const oldOpenAiModel = process.env.OPENAI_MODEL;
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL;
    delete process.env.OPENAI_MODEL;
    try {
      const result = await generateDeckAiText({ action: "notes", markdown: "# Roadmap\n\n- Ship analytics\n- Add brand kit" });
      expect(result.provider).toBe("local");
      expect(result.text).toContain("???");
    } finally {
      restoreEnv("AI_API_KEY", oldKey);
      restoreEnv("OPENAI_API_KEY", oldOpenAiKey);
      restoreEnv("AI_MODEL", oldModel);
      restoreEnv("OPENAI_MODEL", oldOpenAiModel);
    }
  });
});

describe("rateLimit", () =>
  it("blocks requests beyond the limit", async () => {
    const key = `test-${Date.now()}`;
    expect((await rateLimit(key, 2)).allowed).toBe(true);
    expect((await rateLimit(key, 2)).allowed).toBe(true);
    expect((await rateLimit(key, 2)).allowed).toBe(false);
  }));

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
