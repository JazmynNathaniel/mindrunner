import type { Diagnostics } from "@prisma/client";
import type { DiagnosticsDTO } from "@/lib/types";
import { prisma } from "./db";
import type { DiagnosticsInput } from "./validation";

/**
 * The machine's vitals — owner-authored fiction (spec §11). The recipient's
 * SYSTEM DIAGNOSTICS panel renders whatever mood Jaz last fed the machine.
 * DTO shape lives in src/lib/types.ts; re-exported for server-side consumers.
 */
export type { DiagnosticsDTO } from "@/lib/types";

function toDTO(d: Diagnostics): DiagnosticsDTO {
  return {
    cpu: d.cpu,
    memory: d.memory,
    storage: d.storage,
    uptime: d.uptime,
    latency: d.latency,
    catInterference: d.catInterference,
    occupiedPct: d.occupiedPct,
    warning: d.warning,
    flora: d.flora,
  };
}

export async function getDiagnostics(): Promise<DiagnosticsDTO> {
  const existing = await prisma.diagnostics.findUnique({ where: { id: 1 } });
  if (existing) return toDTO(existing);
  return toDTO(await prisma.diagnostics.create({ data: { id: 1 } }));
}

export async function updateDiagnostics(input: DiagnosticsInput): Promise<DiagnosticsDTO> {
  const d = await prisma.diagnostics.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
  return toDTO(d);
}
