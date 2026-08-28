-- CreateTable
CREATE TABLE "OperatorEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorEvent_kind_createdAt_idx" ON "OperatorEvent"("kind", "createdAt");
