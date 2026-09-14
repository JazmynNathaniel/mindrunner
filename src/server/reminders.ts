import type { Reminder } from "@prisma/client";
import { prisma } from "./db";
import { forbidden, notFound } from "./errors";
import type { ReminderInput } from "./validation";
import type { ReminderDTO } from "@/lib/types";

/**
 * REMINDER SIREN — tasks the owner must not forget, mostly armed by the
 * recipient. Both terminals show the same list; the blaring is client-side
 * (past-due + unacknowledged = alarm). Rules:
 *   - anyone authenticated can arm one or purge one
 *   - only the OWNER can acknowledge — silencing the siren is her admission
 *     that she saw it, so his account can't quietly do it for her
 */

function toDTO(r: Reminder): ReminderDTO {
  return {
    id: r.id,
    task: r.task,
    note: r.note,
    dueAt: r.dueAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy as ReminderDTO["createdBy"],
    ackAt: r.ackAt?.toISOString() ?? null,
  };
}

/** All armed reminders (due-soonest first) plus the last few acknowledged. */
export async function listReminders(): Promise<ReminderDTO[]> {
  const [armed, silenced] = await Promise.all([
    prisma.reminder.findMany({ where: { ackAt: null }, orderBy: { dueAt: "asc" } }),
    prisma.reminder.findMany({
      where: { ackAt: { not: null } },
      orderBy: { ackAt: "desc" },
      take: 5,
    }),
  ]);
  return [...armed, ...silenced].map(toDTO);
}

export async function createReminder(input: ReminderInput, role: string): Promise<void> {
  await prisma.reminder.create({
    data: {
      task: input.task,
      note: input.note ?? null,
      dueAt: input.dueAt,
      createdBy: role === "ADMIN" ? "OWNER" : "RECIPIENT",
    },
  });
}

export async function actOnReminder(
  id: string,
  action: "ack" | "delete",
  role: string
): Promise<void> {
  if (action === "ack") {
    if (role !== "ADMIN") throw forbidden("only the owner can silence the siren.");
    // filtered on ackAt:null — only the FIRST acknowledgment stamps the time
    await prisma.reminder.updateMany({ where: { id, ackAt: null }, data: { ackAt: new Date() } });
    const still = await prisma.reminder.findUnique({ where: { id }, select: { id: true } });
    if (!still) throw notFound("reminder");
    return;
  }
  try {
    await prisma.reminder.delete({ where: { id } });
  } catch {
    throw notFound("reminder");
  }
}
