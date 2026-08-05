import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readZip } from "./zip";

function u16(n: number) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; }

/** 手動組出一個最小可用的 ZIP 檔（供測試用；不驗證 CRC，因為 readZip 本身也不檢查）。 */
export function buildZip(entries: { name: string; data: Buffer; method: 0 | 8 }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const payload = e.method === 8 ? deflateRawSync(e.data) : e.data;
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(e.method), u16(0), u16(0),
      u32(0), u32(payload.length), u32(e.data.length),
      u16(nameBuf.length), u16(0), nameBuf,
    ]);
    const localOffset = offset;
    localParts.push(localHeader, payload);
    offset += localHeader.length + payload.length;

    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(e.method), u16(0), u16(0),
      u32(0), u32(payload.length), u32(e.data.length),
      u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOffset), nameBuf,
    ]));
  }
  const centralDir = Buffer.concat(centralParts);
  const centralOffset = offset;
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralDir.length), u32(centralOffset), u16(0),
  ]);
  return Buffer.concat([...localParts, centralDir, eocd]);
}

describe("readZip", () => {
  it("reads STORED and DEFLATE entries back to their original bytes", () => {
    const deflated = "hello deflate ".repeat(50);
    const zip = buildZip([
      { name: "a.txt", data: Buffer.from("hello stored"), method: 0 },
      { name: "dir/b.txt", data: Buffer.from(deflated), method: 8 },
    ]);
    const entries = readZip(zip);
    expect(entries.get("a.txt")?.toString("utf8")).toBe("hello stored");
    expect(entries.get("dir/b.txt")?.toString("utf8")).toBe(deflated);
  });

  it("skips directory entries", () => {
    const zip = buildZip([{ name: "dir/", data: Buffer.alloc(0), method: 0 }]);
    expect(readZip(zip).has("dir/")).toBe(false);
  });

  it("throws on a buffer without an end-of-central-directory marker", () => {
    expect(() => readZip(Buffer.from("not a zip file at all"))).toThrow();
  });
});
