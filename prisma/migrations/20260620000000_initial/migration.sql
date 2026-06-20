CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'GUEST');
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PASSWORD', 'PUBLIC', 'UNLISTED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "name" TEXT,
  "image" TEXT,
  "passwordHash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'GUEST',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deck" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT NOT NULL,
  "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "passwordHash" TEXT,
  "coverImage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Slide" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ViewLog" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "userId" TEXT,
  "slideOrder" INTEGER,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "referer" TEXT,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViewLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Deck_ownerId_idx" ON "Deck"("ownerId");
CREATE INDEX "Deck_visibility_idx" ON "Deck"("visibility");
CREATE INDEX "Slide_deckId_idx" ON "Slide"("deckId");
CREATE UNIQUE INDEX "Slide_deckId_order_key" ON "Slide"("deckId", "order");
CREATE INDEX "ViewLog_deckId_idx" ON "ViewLog"("deckId");
CREATE INDEX "ViewLog_userId_idx" ON "ViewLog"("userId");
CREATE INDEX "ViewLog_viewedAt_idx" ON "ViewLog"("viewedAt");
CREATE INDEX "ViewLog_ipAddress_idx" ON "ViewLog"("ipAddress");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewLog" ADD CONSTRAINT "ViewLog_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewLog" ADD CONSTRAINT "ViewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
