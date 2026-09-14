-- REMINDER SIREN: armed tasks that blare on the admin terminal (and his)
-- until the owner acknowledges them.
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "note" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackAt" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reminder_ackAt_dueAt_idx" ON "Reminder"("ackAt", "dueAt");
