ALTER TABLE "Deck" ADD COLUMN "brandName" TEXT,
ADD COLUMN "brandLogoUrl" TEXT,
ADD COLUMN "brandPrimaryColor" TEXT,
ADD COLUMN "brandAccentColor" TEXT,
ADD COLUMN "brandFont" TEXT,
ADD COLUMN "brandFooter" TEXT;

ALTER TABLE "ViewLog" ADD COLUMN "shareLinkId" TEXT;

CREATE INDEX "ViewLog_shareLinkId_idx" ON "ViewLog"("shareLinkId");
CREATE INDEX "ViewLog_deckId_shareLinkId_idx" ON "ViewLog"("deckId", "shareLinkId");

ALTER TABLE "ViewLog" ADD CONSTRAINT "ViewLog_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
