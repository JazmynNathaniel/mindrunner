import type { RecipientStatus } from "@prisma/client";
import { prisma } from "./db";
import { forbidden } from "./errors";
import type { NodeAction } from "./validation";
import type { NodeStatusDTO } from "@/lib/types";

/**
 * HIM://STATUS — the remote node reports on itself. The recipient's mirror of
 * the owner's mood/doing/location context, kept in a singleton (id = 1) like
 * Diagnostics. Rules:
 *   - only the RECIPIENT transmits telemetry or declares a fuel emergency
 *     (the machine refuses to let the owner put words in his mouth)
 *   - either side can mark the node refueled
 * The HONEY CHICKEN PROTOCOL keeps the FIRST declaration's timestamp, so the
 * panel can report exactly how long the craving has gone unanswered.
 */

function toDTO(s: RecipientStatus): NodeStatusDTO {
  return {
    mood: s.mood,
    doing: s.doing,
    location: s.location,
    note: s.note,
    telemetryAt: s.telemetryAt?.toISOString() ?? null,
    cravingAt: s.cravingAt?.toISOString() ?? null,
  };
}

async function readStatus(): Promise<RecipientStatus> {
  const existing = await prisma.recipientStatus.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.recipientStatus.create({ data: { id: 1 } });
}

export async function getNodeStatus(): Promise<NodeStatusDTO> {
  return toDTO(await readStatus());
}

export async function applyNodeAction(input: NodeAction, role: string): Promise<NodeStatusDTO> {
  if (input.action === "telemetry") {
    if (role === "ADMIN") throw forbidden("the node reports its own telemetry.");
    // whole-form semantics: an omitted field clears its value
    const fields = {
      mood: input.mood ?? null,
      doing: input.doing ?? null,
      location: input.location ?? null,
      note: input.note ?? null,
      telemetryAt: new Date(),
    };
    return toDTO(
      await prisma.recipientStatus.upsert({
        where: { id: 1 },
        update: fields,
        create: { id: 1, ...fields },
      })
    );
  }

  if (input.action === "crave") {
    if (role === "ADMIN") throw forbidden("only the node can declare a fuel emergency.");
    const s = await readStatus();
    if (s.cravingAt) return toDTO(s); // already blaring — keep the first declaration
    return toDTO(
      await prisma.recipientStatus.update({ where: { id: 1 }, data: { cravingAt: new Date() } })
    );
  }

  // "fed": whoever delivered (or gave up and cooked) stands the protocol down
  await readStatus();
  return toDTO(
    await prisma.recipientStatus.update({ where: { id: 1 }, data: { cravingAt: null } })
  );
}
