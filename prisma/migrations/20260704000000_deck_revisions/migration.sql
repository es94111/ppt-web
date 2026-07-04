CREATE TABLE "DeckRevision" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "authorId" TEXT,
  "title" TEXT NOT NULL,
  "markdown" TEXT NOT NULL,
  "slideCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeckRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeckRevision_deckId_idx" ON "DeckRevision"("deckId");
CREATE INDEX "DeckRevision_createdAt_idx" ON "DeckRevision"("createdAt");

ALTER TABLE "DeckRevision" ADD CONSTRAINT "DeckRevision_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
