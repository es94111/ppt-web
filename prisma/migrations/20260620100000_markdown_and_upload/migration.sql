-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MARKDOWN', 'PPTX');

-- CreateEnum
CREATE TYPE "DeckStatus" AS ENUM ('READY', 'PROCESSING', 'FAILED');

-- AlterTable
ALTER TABLE "Deck"
  ADD COLUMN "sourceType" "SourceType" NOT NULL DEFAULT 'MARKDOWN',
  ADD COLUMN "status" "DeckStatus" NOT NULL DEFAULT 'READY',
  ADD COLUMN "sourceFile" TEXT;
