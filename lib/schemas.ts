import { z } from "zod";

// 投影片內容：Markdown 原生（可編輯）或 圖片（PPTX 轉出，唯讀）
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
export const deckCreateSchema = z.object({ title: z.string().trim().min(1).max(150), description: z.string().trim().max(1000).optional(), visibility: z.enum(["PRIVATE", "AUTHENTICATED", "PASSWORD", "PUBLIC", "UNLISTED"]).default("PRIVATE") });
export const deckUpdateSchema = deckCreateSchema.partial().extend({ password: z.string().min(6).max(128).nullable().optional() });
export const viewSchema = z.object({ slideOrder: z.number().int().min(1).max(10000).nullable().optional() });
