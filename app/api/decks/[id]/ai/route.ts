import { NextRequest, NextResponse } from "next/server";
import { generateDeckAiText } from "@/lib/ai-assistant";
import { getClientIp, getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { deckAiSchema } from "@/lib/schemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  if (access.deck.sourceType === "PPTX") return jsonError("PPTX 匯入的簡報為唯讀，無法使用 AI 編輯", 400);
  const ip = getClientIp(request);
  if (!(await rateLimit(`deck-ai:${user.id}:${id}:${ip}`, 20, 60_000)).allowed) return jsonError("AI 助理使用過於頻繁，請稍後再試", 429);

  const parsed = deckAiSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("AI 助理輸入不正確", 400, parsed.error.flatten());
  const result = await generateDeckAiText({ ...parsed.data, title: access.deck.title });
  return NextResponse.json(result);
}
