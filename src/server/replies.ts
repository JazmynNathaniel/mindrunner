import type { Reply } from "@prisma/client";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import type { ReplyInput } from "./validation";
import type { AdminReplyDTO, DownlinkThreadDTO } from "@/lib/types";

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
    responseText: r.responseText,
    respondedAt: r.respondedAt?.toISOString() ?? null,
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

/**
 * The downlink: her answer to one of his transmissions. Decrypt-gated —
 * answering something she hasn't read would break the whole ritual. Sending
 * again overwrites (one response per transmission; he can always uplink more).
 */
export async function respondToReply(id: string, text: string): Promise<AdminReplyDTO> {
  const existing = await prisma.reply.findUnique({ where: { id } });
  if (!existing) throw notFound("transmission");
  if (!existing.seenAt) throw badRequest("decrypt the transmission before answering it.");
  const row = await prisma.reply.update({
    where: { id },
    data: { responseText: text, respondedAt: new Date() },
    include: { thought: { select: { text: true } } },
  });
  return toDTO(row);
}

/** Recipient-facing: his transmissions that earned an answer, newest first. */
export async function listDownlink(): Promise<DownlinkThreadDTO[]> {
  const rows = await prisma.reply.findMany({
    where: { respondedAt: { not: null } },
    orderBy: { respondedAt: "desc" },
    take: 5,
  });
  return rows.map((r) => ({
    id: r.id,
    sent: r.text,
    mischief: r.mischief,
    sentAt: r.createdAt.toISOString(),
    response: r.responseText ?? "",
    respondedAt: r.respondedAt!.toISOString(),
  }));
}

export async function deleteReply(id: string): Promise<void> {
  try {
    await prisma.reply.delete({ where: { id } });
  } catch {
    throw notFound("transmission");
  }
}
