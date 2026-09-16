-- CHICKEN PROTOCOLS: the fuel-craving flag retires; selfie mechanics replace
-- it. Selfie bytes live in Postgres and are served only through authed routes.
ALTER TABLE "RecipientStatus" DROP COLUMN "cravingAt";

CREATE TABLE "Selfie" (
    "id" TEXT NOT NULL,
    "dish" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsealedAt" TIMESTAMP(3),

    CONSTRAINT "Selfie_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Selfie_dish_unsealedAt_createdAt_idx" ON "Selfie"("dish", "unsealedAt", "createdAt");

CREATE TABLE "SelfieDemand" (
    "id" TEXT NOT NULL,
    "dish" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metAt" TIMESTAMP(3),

    CONSTRAINT "SelfieDemand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SelfieDemand_dish_metAt_idx" ON "SelfieDemand"("dish", "metAt");
