-- JAZ://VAULT: reveal petitions against the owner's private journal (DRAFT
-- thoughts). Approval snapshots the unsealed entry's text into the request.
CREATE TABLE "RevealRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "revealText" TEXT,
    "revealedThoughtAt" TIMESTAMP(3),

    CONSTRAINT "RevealRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevealRequest_status_createdAt_idx" ON "RevealRequest"("status", "createdAt");
