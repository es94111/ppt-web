import { joinSlidesToMarkdown, parseMarkdownDeck } from "@/lib/slides";

export type DeckAiAction = "draft" | "rewrite" | "shorten" | "tone" | "notes";

export type DeckAiRequest = {
  action: DeckAiAction;
  title?: string | null;
  input?: string;
  markdown?: string;
  selectedText?: string;
  tone?: string;
  audience?: string;
  slideCount?: number;
};

export type DeckAiResult = {
  text: string;
  provider: "configured" | "local";
};

type ChatMessage = { role: "system" | "user"; content: string };

export async function generateDeckAiText(request: DeckAiRequest): Promise<DeckAiResult> {
  const prompt = buildPrompt(request);
  const configured = await callConfiguredChat(prompt);
  if (configured) return { text: cleanupMarkdown(configured), provider: "configured" };
  return { text: fallbackText(request), provider: "local" };
}

function buildPrompt(request: DeckAiRequest): ChatMessage[] {
  const audience = request.audience?.trim() || "一般商務聽眾";
  const tone = request.tone?.trim() || "清楚、可信、簡潔";
  const slideCount = request.slideCount ?? 6;
  const target = request.action === "draft"
    ? request.input?.trim() || request.markdown?.trim() || ""
    : request.selectedText?.trim() || request.markdown?.trim() || request.input?.trim() || "";
  const sharedRules = [
    "你是專業的繁體中文簡報編輯與講稿助理。",
    "只輸出 Markdown，不要包 code fence，不要加入解釋文字。",
    "投影片之間使用獨立一行 --- 分隔。",
    "每頁內容要適合直接貼進簡報編輯器。",
  ].join("\n");

  const tasks: Record<DeckAiAction, string> = {
    draft: `根據使用者提供的主題或長文，產生 ${slideCount} 張投影片草稿。第一頁是封面，最後一頁是結論或行動建議。`,
    rewrite: "改寫內容，使語句更順、更有簡報節奏；保留原本頁數與主要意思。",
    shorten: "濃縮內容，每頁保留標題與最多 3 個重點；刪除冗詞但保留關鍵資訊。",
    tone: `調整語氣為「${tone}」，使內容更適合「${audience}」；保留頁數與重點。`,
    notes: "根據每頁投影片內容產生講者備註。每頁可見內容下方加入獨立一行 ???，再寫 2 到 4 句講稿。不要改動投影片可見內容。",
  };

  return [
    { role: "system", content: sharedRules },
    {
      role: "user",
      content: [
        `任務：${tasks[request.action]}`,
        `簡報標題：${request.title || "未命名簡報"}`,
        `目標聽眾：${audience}`,
        `語氣：${tone}`,
        "輸入內容：",
        target || "請以使用者未提供內容的情境，產生一份可再編輯的通用簡報架構。",
      ].join("\n\n"),
    },
  ];
}

async function callConfiguredChat(messages: ChatMessage[]) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;

  const baseUrl = (process.env.AI_API_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.35 }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackText(request: DeckAiRequest) {
  if (request.action === "draft") return fallbackDraft(request);
  if (request.action === "notes") return fallbackNotes(request.markdown || request.selectedText || request.input || "");
  return fallbackEdit(request);
}

function fallbackDraft(request: DeckAiRequest) {
  const raw = request.input?.trim() || request.markdown?.trim() || request.title?.trim() || "新簡報";
  const title = firstHeading(raw) || sentence(raw, 52) || "新簡報";
  const points = extractPoints(raw);
  const audience = request.audience?.trim() || "目標聽眾";
  const slideCount = Math.min(Math.max(request.slideCount ?? 6, 3), 10);
  const sections = [
    `# ${title}\n\n${audience}導向的簡報草稿`,
    `## 為什麼現在重要\n\n${bullets(points.slice(0, 3), ["市場正在變化", "既有做法開始出現瓶頸", "需要更快形成共識"])}`,
    `## 核心觀察\n\n${bullets(points.slice(3, 6), ["使用者需要更清楚的脈絡", "決策者重視可衡量成果", "團隊需要可重複的方法"])}`,
    `## 建議方向\n\n- 先聚焦最能創造價值的情境\n- 用小範圍試行驗證假設\n- 將成功做法整理成標準流程`,
    `## 執行計畫\n\n- 第 1 週：確認目標與衡量指標\n- 第 2-3 週：完成第一版內容與流程\n- 第 4 週：收集回饋並調整`,
    `## 結論與下一步\n\n- 對齊目標聽眾的真正需求\n- 用清楚的投影片推動決策\n- 安排下一次檢視與負責人`,
  ];
  return sections.slice(0, slideCount).join("\n\n---\n\n");
}

function fallbackEdit(request: DeckAiRequest) {
  const source = request.selectedText?.trim() || request.markdown?.trim() || request.input?.trim() || "";
  if (!source) return "";
  const sections = parseMarkdownDeck(source).map((slide) => {
    const lines = slide.markdown.split("\n");
    const heading = lines.find((line) => /^#{1,3}\s+/.test(line.trim())) || `## ${sentence(slide.markdown, 32) || "重點"}`;
    const points = extractPoints(slide.markdown);
    const shortPoints = points.slice(0, request.action === "shorten" ? 3 : 5);
    const tone = request.action === "tone" && request.tone ? `\n\n> 語氣調整：${request.tone.trim()}` : "";
    const rewritten = `${heading}\n\n${bullets(shortPoints, ["釐清目標", "聚焦重點", "提出下一步"])}${tone}`;
    return { content: { kind: "markdown", markdown: rewritten }, notes: slide.notes };
  });
  return joinSlidesToMarkdown(sections);
}

function fallbackNotes(markdown: string) {
  const sections = parseMarkdownDeck(markdown);
  return sections.map((slide, index) => {
    const title = firstHeading(slide.markdown) || `第 ${index + 1} 頁`;
    const points = extractPoints(slide.markdown).slice(0, 3);
    const notes = [
      `這一頁先帶聽眾聚焦在「${title}」。`,
      points.length ? `可以依序說明：${points.join("、")}。` : "用一到兩個例子補足背景，避免只念投影片文字。",
      "最後收斂到這頁想讓聽眾記住的重點，再銜接下一頁。",
    ].join("\n");
    return `${slide.markdown.trim()}\n\n???\n${notes}`;
  }).join("\n\n---\n\n");
}

function extractPoints(text: string) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\n|。|；|;|\.\s+/)
    .map((line) => line.replace(/^[-*#>\d.\s]+/, "").trim())
    .filter((line) => line.length >= 4 && !/^---+$/.test(line));
  return Array.from(new Set(cleaned)).slice(0, 18);
}

function firstHeading(text: string) {
  return text.split("\n").map((line) => line.trim()).find((line) => /^#{1,2}\s+/.test(line))?.replace(/^#{1,2}\s+/, "").slice(0, 80);
}

function sentence(text: string, max: number) {
  return text.replace(/[#>*`\-\[\]()]|\s+/g, " ").trim().slice(0, max);
}

function bullets(points: string[], fallback: string[]) {
  const values = points.length ? points : fallback;
  return values.map((point) => `- ${point}`).join("\n");
}

function cleanupMarkdown(text: string) {
  return text
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
