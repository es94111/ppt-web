import { z } from "zod";
import { BRAND_FONT_VALUES } from "./brand";

// 投影片內容：Markdown 原生（可編輯）或 圖片（舊 PPTX 匯入資料相容）
export const slideContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("markdown"), markdown: z.string().max(20000) }).strict(),
  z.object({ kind: z.literal("image"), src: z.string().min(1).max(2048), alt: z.string().max(300).optional() }).strict(),
]);
export type SlideContent = z.infer<typeof slideContentSchema>;

// 整份 Deck 的 Markdown 文件（編輯器儲存用；以 --- 分頁）
export const deckMarkdownSchema = z.object({ markdown: z.string().max(500000) }).strict();

// Markdown 檔匯入（建立新 Deck）
export const markdownImportSchema = z.object({
  title: z.string().trim().min(1).max(150),
  markdown: z.string().min(1).max(500000),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128).regex(/[a-z]/, "需包含小寫字母").regex(/[A-Z]/, "需包含大寫字母").regex(/[0-9]/, "需包含數字")
});
export const deckCreateSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(["PRIVATE", "AUTHENTICATED", "PASSWORD", "PUBLIC", "UNLISTED"]).default("PRIVATE"),
  category: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().max(32)).max(8).optional(),
});
const brandColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal(""));
const brandLogoSchema = z.string().trim().max(2048).refine((value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value), "Logo 必須是 https:// 或站內 / 開頭路徑");
export const brandKitSchema = z.object({
  name: z.string().trim().max(80).optional(),
  logoUrl: brandLogoSchema.optional(),
  primaryColor: brandColorSchema.optional(),
  accentColor: brandColorSchema.optional(),
  font: z.enum(BRAND_FONT_VALUES).or(z.literal("")).optional(),
  footer: z.string().trim().max(120).optional(),
}).strict();
export const deckUpdateSchema = deckCreateSchema.partial().extend({ password: z.string().min(10).max(128).nullable().optional(), brand: brandKitSchema.optional() });
export const viewSchema = z.object({ slideOrder: z.number().int().min(1).max(10000).nullable().optional(), shareToken: z.string().min(8).max(200).optional() });
export const shareLinkCreateSchema = z.object({
  label: z.string().trim().max(80).optional(),
  password: z.string().min(10).max(128).optional().or(z.literal("")),
  allowDownload: z.boolean().default(false),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict();
export const collaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
}).strict();
export const commentCreateSchema = z.object({
  slideId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
}).strict();
export const commentResolveSchema = z.object({ resolved: z.boolean() }).strict();
export const favoriteSchema = z.object({ favorite: z.boolean() }).strict();
export const deckAiSchema = z.object({
  action: z.enum(["draft", "rewrite", "shorten", "tone", "notes"]),
  input: z.string().max(500000).optional(),
  markdown: z.string().max(500000).optional(),
  selectedText: z.string().max(50000).optional(),
  tone: z.string().trim().max(40).optional(),
  audience: z.string().trim().max(120).optional(),
  slideCount: z.number().int().min(1).max(30).optional(),
}).strict();
