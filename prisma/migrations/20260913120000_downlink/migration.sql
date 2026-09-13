-- The downlink: her answer to his uplink transmission. Nullable + additive
-- (preview deploys share the prod database).
ALTER TABLE "Reply" ADD COLUMN "responseText" TEXT;
ALTER TABLE "Reply" ADD COLUMN "respondedAt" TIMESTAMP(3);
