-- COMMS: threaded chat rooms rooted on uplink transmissions.
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_replyId_createdAt_idx" ON "ChatMessage"("replyId", "createdAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- carry the pre-chat downlinks into the chat era: her single responses become
-- each room's opening message (columns stay behind as inert legacy)
INSERT INTO "ChatMessage" ("id", "replyId", "sender", "text", "createdAt")
SELECT gen_random_uuid(), "id", 'OWNER', "responseText", COALESCE("respondedAt", CURRENT_TIMESTAMP)
FROM "Reply"
WHERE "responseText" IS NOT NULL;
