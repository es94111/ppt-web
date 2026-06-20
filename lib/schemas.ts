import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);
const position = z.number().finite().min(-2000).max(4000);
const size = z.number().finite().min(1).max(4000);
const base = { id: z.string().min(1).max(80), x: position, y: position, w: size, h: size };

export const elementSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("text"), text: z.string().max(5000), fontSize: z.number().min(8).max(200), fontWeight: z.number().int().min(100).max(900).optional(), color, align: z.enum(["left", "center", "right"]).optional() }).strict(),
  z.object({ ...base, type: z.literal("image"), src: z.string().url().max(2048), alt: z.string().max(300).optional() }).strict(),
  z.object({ ...base, type: z.literal("shape"), shape: z.enum(["rect", "ellipse", "line"]), fill: color, radius: z.number().min(0).max(200).optional() }).strict()
]);

export const slideContentSchema = z.object({ background: color.default("#ffffff"), elements: z.array(elementSchema).max(200) }).strict();
export type SlideContent = z.infer<typeof slideContentSchema>;
export type SlideElement = z.infer<typeof elementSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128).regex(/[a-z]/, "需包含小寫字母").regex(/[A-Z]/, "需包含大寫字母").regex(/[0-9]/, "需包含數字")
});
export const deckCreateSchema = z.object({ title: z.string().trim().min(1).max(150), description: z.string().trim().max(1000).optional(), visibility: z.enum(["PRIVATE", "PASSWORD", "PUBLIC", "UNLISTED"]).default("PRIVATE") });
export const deckUpdateSchema = deckCreateSchema.partial().extend({ password: z.string().min(6).max(128).nullable().optional() });
export const viewSchema = z.object({ slideOrder: z.number().int().min(1).max(10000).nullable().optional() });
