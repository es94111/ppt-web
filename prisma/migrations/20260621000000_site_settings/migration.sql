CREATE TABLE "SiteSetting" (
  "id" INTEGER NOT NULL,
  "allowPublicRegistration" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSetting" ("id", "allowPublicRegistration", "updatedAt")
VALUES (1, true, CURRENT_TIMESTAMP);
