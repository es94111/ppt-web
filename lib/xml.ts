// 極簡 XML 解析器：只供讀取 OOXML（.pptx 內部 XML 片段）使用，不使用任何第三方套件。
// 不處理 DTD / 命名空間 URI 對應等進階特性，命名空間前綴（如 a:t、p:sp）直接視為標籤名的一部分。
export type XmlNode = { tag: string; attrs: Record<string, string>; children: XmlNode[] };

const TEXT_TAG = "#text";
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const TOKEN_RE = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|[^<]+/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    if (m[1] !== undefined) attrs[m[1]] = decodeEntities(m[2]);
    else if (m[3] !== undefined) attrs[m[3]] = decodeEntities(m[4]);
  }
  return attrs;
}

/** 將 XML 字串解析為節點樹（虛擬根節點 tag 為 "#root"）；文字節點以 tag "#text"、attrs.value 儲存內容。 */
export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(xml))) {
    const [full, cdata, closeTag, openTag, attrsRaw, selfClose] = m;
    const top = stack[stack.length - 1];
    if (cdata !== undefined) {
      top.children.push({ tag: TEXT_TAG, attrs: { value: cdata }, children: [] });
    } else if (closeTag) {
      if (stack.length > 1) stack.pop();
    } else if (openTag) {
      const node: XmlNode = { tag: openTag, attrs: parseAttrs(attrsRaw || ""), children: [] };
      top.children.push(node);
      if (!selfClose) stack.push(node);
    } else if (full.startsWith("<!--") || full.startsWith("<?")) {
      // 註解 / XML 宣告：略過
    } else {
      top.children.push({ tag: TEXT_TAG, attrs: { value: decodeEntities(full) }, children: [] });
    }
  }
  return root;
}

/** 深度優先搜尋所有符合 tag 的子孫節點（含跨層級）。 */
export function findAll(node: XmlNode, tag: string, out: XmlNode[] = []): XmlNode[] {
  for (const child of node.children) {
    if (child.tag === tag) out.push(child);
    findAll(child, tag, out);
  }
  return out;
}

/** 深度優先搜尋第一個符合 tag 的子孫節點（含跨層級）。 */
export function findFirst(node: XmlNode, tag: string): XmlNode | undefined {
  for (const child of node.children) {
    if (child.tag === tag) return child;
    const found = findFirst(child, tag);
    if (found) return found;
  }
  return undefined;
}

/** 只取節點「直接」子層中符合 tag 者，保留原始文件順序。 */
export function children(node: XmlNode, tag: string): XmlNode[] {
  return node.children.filter((c) => c.tag === tag);
}

/** 節點內所有 #text 子孫依文件順序串接而成的純文字。 */
export function textContent(node: XmlNode): string {
  let out = "";
  for (const child of node.children) {
    out += child.tag === TEXT_TAG ? child.attrs.value : textContent(child);
  }
  return out;
}
