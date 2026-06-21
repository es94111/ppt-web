import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7：連線 URL 由 schema 移到此處（CLI 的 migrate/generate 使用）。
// 執行期的 PrismaClient 連線見 lib/db.ts（pg driver adapter）。
// 用 process.env（而非 env()）以免 `prisma generate`（不需連線）在 DATABASE_URL
// 未設定時失敗；需要連線的指令（migrate deploy 等）在執行環境會帶入真實值。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
