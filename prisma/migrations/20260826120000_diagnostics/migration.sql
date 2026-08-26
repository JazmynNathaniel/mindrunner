-- CreateTable
CREATE TABLE "Diagnostics" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "cpu" TEXT NOT NULL DEFAULT 'emotionally unstable',
    "memory" TEXT NOT NULL DEFAULT 'mostly cats',
    "storage" TEXT NOT NULL DEFAULT '97% thoughts',
    "uptime" TEXT NOT NULL DEFAULT 'questionable',
    "latency" TEXT NOT NULL DEFAULT 'emotional',
    "catInterference" TEXT NOT NULL DEFAULT 'HIGH',
    "occupiedPct" INTEGER NOT NULL DEFAULT 87,
    "warning" TEXT NOT NULL DEFAULT 'too many thoughts detected',
    "flora" TEXT NOT NULL DEFAULT 'THRIVING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnostics_pkey" PRIMARY KEY ("id")
);

