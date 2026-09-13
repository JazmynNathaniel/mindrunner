-- Owner context on a thought: what she was doing / where she was when it
-- struck. Nullable + additive (preview deploys share the prod database).
ALTER TABLE "Thought" ADD COLUMN "doing" TEXT;
ALTER TABLE "Thought" ADD COLUMN "location" TEXT;
