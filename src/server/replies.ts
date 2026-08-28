import type { Reply } from "@prisma/client";
import { prisma } from "./db";
import { notFound } from "./errors";
import type { ReplyInput } from "./validation";
import type { AdminReplyDTO } from "@/lib/types";

type ReplyRow = Reply & { thought: { text: string } | null };

const EXCERPT_LEN = 90;

function toDTO(r: ReplyRow): AdminReplyDTO {
  return {
    id: r.id,
    // server-redacted until decrypted — the mischief meter is the only preview,
    // so not even devtools can spoil the reveal
    text: r.seenAt ? r.text : null,
    mischief: r.mischief,
    createdAt: r.createdAt.toISOString(),
    seenAt: r.seenAt?.toISOString() ?? null,
    thoughtExcerpt: r.thought
      ? r.thought.text.length > EXCERPT_LEN
        ? `${r.thought.text.slice(0, EXCERPT_LEN)}...`
        : r.thought.text
      : null,
  };
}

export async function createReply(input: ReplyInput): Promise<void> {
  // a stale or bogus thought id degrades to an untethered transmission
  let thoughtId: string | null = null;
  if (input.thoughtId) {
    const t = await prisma.thought.findUnique({
      where: { id: input.thoughtId },
      select: { id: true },
    });
    thoughtId = t?.id ?? null;
  }
  await prisma.reply.create({
    data: { text: input.text, mischief: input.mischief, thoughtId },
  });
}

export async function listReplies(): Promise<AdminReplyDTO[]> {
  const rows = await prisma.reply.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { thought: { select: { text: true } } },
  });
  return rows.map(toDTO);
}

export async function decryptReply(id: string): Promise<AdminReplyDTO> {
  // updateMany filtered on seenAt:null — only the FIRST decrypt stamps the time
  await prisma.reply.updateMany({ where: { id, seenAt: null }, data: { seenAt: new Date() } });
  const row = await prisma.reply.findUnique({
    where: { id },
    include: { thought: { select: { text: true } } },
  });
  if (!row) throw notFound("transmission");
  return toDTO(row);
}

export async function deleteReply(id: string): Promise<void> {
  try {
    await prisma.reply.delete({ where: { id } });
  } catch {
    throw notFound("transmission");
  }
}
