import type { ChatMessage } from "@prisma/client";
import type { ChannelDTO, ChatMessageDTO } from "@/lib/types";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";

/**
 * COMMS — threaded chat rooms, one per uplink transmission.
 *
 * The ritual is preserved as access rules:
 *   - the OWNER may enter a room only after decrypting its root transmission
 *   - the RECIPIENT may enter only once the owner has posted (her first
 *     message is what opens the channel; until then his uplink just sits)
 * After that, both post freely. Nothing expires; purging the root Reply
 * cascades the whole room away (her kill switch, as everywhere else).
 */

type Sender = "OWNER" | "RECIPIENT";

const senderForRole = (role: string): Sender => (role === "ADMIN" ? "OWNER" : "RECIPIENT");

const EXCERPT_LEN = 60;
const excerpt = (s: string) => (s.length > EXCERPT_LEN ? `${s.slice(0, EXCERPT_LEN)}...` : s);

function toMessageDTO(m: ChatMessage): ChatMessageDTO {
  return {
    id: m.id,
    sender: m.sender as Sender,
    text: m.text,
    at: m.createdAt.toISOString(),
  };
}

async function requireAccess(replyId: string, role: string) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply) throw notFound("channel");
  if (role === "ADMIN") {
    if (!reply.seenAt) throw badRequest("decrypt the transmission before entering the channel.");
  } else {
    const opened = await prisma.chatMessage.findFirst({
      where: { replyId, sender: "OWNER" },
      select: { id: true },
    });
    // an unopened room simply does not exist for him
    if (!opened) throw notFound("channel");
  }
  return reply;
}

/** Open rooms (owner has posted at least once), most recently active first. */
export async function listChannels(): Promise<ChannelDTO[]> {
  const rows = await prisma.reply.findMany({
    where: { messages: { some: { sender: "OWNER" } } },
    include: {
      thought: { select: { text: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows
    .map((r) => {
      const last = r.messages[0];
      return {
        id: r.id,
        topic: r.thought ? excerpt(r.thought.text) : null,
        rootText: r.text,
        mischief: r.mischief,
        openedAt: r.createdAt.toISOString(),
        lastAt: (last?.createdAt ?? r.createdAt).toISOString(),
        lastFrom: (last?.sender ?? "RECIPIENT") as Sender,
        messageCount: r._count.messages,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getMessages(replyId: string, role: string): Promise<ChatMessageDTO[]> {
  await requireAccess(replyId, role);
  const rows = await prisma.chatMessage.findMany({
    where: { replyId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMessageDTO);
}

/** Post as the current role and return the full thread. */
export async function postMessage(
  replyId: string,
  role: string,
  text: string
): Promise<ChatMessageDTO[]> {
  await requireAccess(replyId, role);
  await prisma.chatMessage.create({
    data: { replyId, sender: senderForRole(role), text },
  });
  return getMessages(replyId, role);
}