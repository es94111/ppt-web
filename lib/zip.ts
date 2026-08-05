// 純手刻 ZIP（PKZIP）讀取器：只依賴 Node 內建 zlib，不使用任何第三方套件。
// .pptx 本質是一個 ZIP 檔，這裡只實作讀取 .pptx 會用到的子集：
// 標準（非 ZIP64）中央目錄 + STORED（0）/ DEFLATE（8）兩種壓縮方式。
import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_ENTRIES = 5000;
const MAX_ENTRY_BYTES = 200 * 1024 * 1024; // 單一項目上限 200MB，避免解壓縮炸彈

export type ZipEntries = Map<string, Buffer>;

function findEndOfCentralDirectory(buf: Buffer): number {
  const searchFloor = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= searchFloor; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new Error("找不到 ZIP 結尾標記，檔案可能已損毀");
}

function extractEntry(buf: Buffer, localOffset: number, method: number, compressedSize: number, uncompressedSize: number): Buffer {
  if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== LOCAL_FILE_SIGNATURE) {
    throw new Error("ZIP 本機檔頭毀損");
  }
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return Buffer.from(raw);
  if (method === 8) {
    const out = inflateRawSync(raw);
    if (out.length !== uncompressedSize) throw new Error("解壓縮後大小與紀錄不符");
    return out;
  }
  throw new Error(`不支援的 ZIP 壓縮方式（method=${method}）`);
}

/** 解析 ZIP 檔中央目錄並回傳所有檔案項目（檔名 → 解壓縮後內容）。目錄項目會被略過。 */
export function readZip(buf: Buffer): ZipEntries {
  const eocd = findEndOfCentralDirectory(buf);
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const centralDirSize = buf.readUInt32LE(eocd + 12);
  const centralDirOffset = buf.readUInt32LE(eocd + 16);
  if (totalEntries === 0xffff || centralDirSize === 0xffffffff || centralDirOffset === 0xffffffff) {
    throw new Error("不支援 ZIP64 格式的檔案");
  }
  if (totalEntries > MAX_ENTRIES) throw new Error("壓縮檔項目數量過多");

  const entries: ZipEntries = new Map();
  let ptr = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== CENTRAL_DIR_SIGNATURE) {
      throw new Error("ZIP 中央目錄毀損");
    }
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const uncompressedSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error(`壓縮檔項目「${name}」過大`);

    if (!name.endsWith("/") && uncompressedSize > 0) {
      entries.set(name, extractEntry(buf, localOffset, method, compressedSize, uncompressedSize));
    } else if (!name.endsWith("/")) {
      entries.set(name, Buffer.alloc(0));
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
