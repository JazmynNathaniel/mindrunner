-- Uplink attachments: song links (AUDIO_REF) and gifs ride along on
-- transmissions; chat messages learn kinds so a message can BE a gif.
ALTER TABLE "Reply" ADD COLUMN "songUrl" TEXT;
ALTER TABLE "Reply" ADD COLUMN "gifUrl" TEXT;

ALTER TABLE "ChatMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'TEXT';
