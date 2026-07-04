CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'COMMENTER', 'EDITOR');

ALTER TABLE "Deck" ADD COLUMN "category" TEXT;
CREATE INDEX "Deck_category_idx" ON "Deck"("category");

CREATE TABLE "ShareLink" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "createdById" TEXT,
  "label" TEXT,
  "passwordHash" TEXT,
  "allowDownload" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_deckId_idx" ON "ShareLink"("deckId");
CREATE INDEX "ShareLink_token_idx" ON "ShareLink"("token");
CREATE INDEX "ShareLink_expiresAt_idx" ON "ShareLink"("expiresAt");

CREATE TABLE "DeckCollaborator" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeckCollaborator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeckCollaborator_deckId_userId_key" ON "DeckCollaborator"("deckId", "userId");
CREATE INDEX "DeckCollaborator_userId_idx" ON "DeckCollaborator"("userId");

CREATE TABLE "SlideComment" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "slideId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlideComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SlideComment_deckId_idx" ON "SlideComment"("deckId");
CREATE INDEX "SlideComment_slideId_idx" ON "SlideComment"("slideId");
CREATE INDEX "SlideComment_authorId_idx" ON "SlideComment"("authorId");
CREATE INDEX "SlideComment_resolvedAt_idx" ON "SlideComment"("resolvedAt");

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

CREATE TABLE "DeckTag" (
  "deckId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "DeckTag_pkey" PRIMARY KEY ("deckId","tagId")
);
CREATE INDEX "DeckTag_tagId_idx" ON "DeckTag"("tagId");

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Favorite_userId_deckId_key" ON "Favorite"("userId", "deckId");
CREATE INDEX "Favorite_deckId_idx" ON "Favorite"("deckId");

ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeckCollaborator" ADD CONSTRAINT "DeckCollaborator_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeckCollaborator" ADD CONSTRAINT "DeckCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlideComment" ADD CONSTRAINT "SlideComment_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlideComment" ADD CONSTRAINT "SlideComment_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlideComment" ADD CONSTRAINT "SlideComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeckTag" ADD CONSTRAINT "DeckTag_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeckTag" ADD CONSTRAINT "DeckTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
