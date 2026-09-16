import type { RecipientStatus } from "@prisma/client";
import { prisma } from "./db";
import { forbidden } from "./errors";
import type { NodeAction } from "./validation";
import type { NodeStatusDTO } from "@/lib/types";

/**
 * HIM://STATUS — the remote node reports on itself. The recipient's mirror of
 * the owner's mood/doing/location context, kept in a singleton (id = 1) like
 * Diagnostics. Only the RECIPIENT transmits telemetry — the machine refuses
 * to let the owner put words in his mouth. (Fuel-craving mechanics retired
 * 2026-09-16; the chicken protocols live in src/server/protocols.ts now.)
 */

function toDTO(s: RecipientStatus): NodeStatusDTO {
  return {
    mood: s.mood,
    doing: s.doing,
    location: s.location,
    note: s.note,
    telemetryAt: s.telemetryAt?.toISOString() ?? null,
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
