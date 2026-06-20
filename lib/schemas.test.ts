import { describe, expect, it } from "vitest";
import { registerSchema, slideContentSchema } from "./schemas";
import { splitMarkdownSlides, joinSlidesToMarkdown } from "./slides";
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
});

describe("registerSchema", () =>
  it("enforces password complexity", () =>
    expect(registerSchema.safeParse({ name: "A", email: "a@example.com", password: "alllowercase1" }).success).toBe(false)));

describe("rateLimit", () =>
  it("blocks requests beyond the limit", () => {
    const key = `test-${Date.now()}`;
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(false);
  }));
