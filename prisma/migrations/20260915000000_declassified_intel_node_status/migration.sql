-- DECLASSIFIED INTEL: fun facts neither side would tell the general public.
-- One shared feed; both accounts post and read the same file.
CREATE TABLE "FunFact" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunFact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FunFact_createdAt_idx" ON "FunFact"("createdAt");

-- HIM://STATUS singleton: the recipient's self-reported telemetry plus the
-- HONEY CHICKEN PROTOCOL flag (cravingAt).
CREATE TABLE "RecipientStatus" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mood" TEXT,
    "doing" TEXT,
    "location" TEXT,
    "note" TEXT,
    "telemetryAt" TIMESTAMP(3),
    "cravingAt" TIMESTAMP(3),

    CONSTRAINT "RecipientStatus_pkey" PRIMARY KEY ("id")
);
