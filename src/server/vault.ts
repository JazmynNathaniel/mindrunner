import type { RevealRequest } from "@prisma/client";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import type { RevealDTO, VaultStateDTO } from "@/lib/types";

/**
 * JAZ://VAULT — the owner's DRAFT thoughts are her private journal. Rules:
 *   - anyone authenticated reads the vault STATE (count + petitions), but
 *     entry text never leaves the server except via an explicit approval
 *   - only the recipient petitions, and only one PENDING petition exists at
 *     a time (the route enforces who; this module enforces how many)
 *   - only the owner resolves. Approval snapshots the chosen entry's text
 *     and original write-time so later edits/deletes don't rewrite history;
 *     the entry itself stays a draft in her journal.
 */

const REVEAL_HISTORY = 5;

function toRevealDTO(r: RevealRequest): RevealDTO {
  return {
    id: r.id,
    status: r.status as RevealDTO["status"],
    requestedAt: r.createdAt.toISOString(),
    resolvedAt: (r.resolvedAt ?? r.createdAt).toISOString(),
    text: r.revealText,
    thoughtAt: r.revealedThoughtAt?.toISOString() ?? null,
  };
}

export async function getVaultState(): Promise<VaultStateDTO> {
  const [sealed, pending, resolved] = await Promise.all([
    prisma.thought.count({ where: { status: "DRAFT" } }),
    prisma.revealRequest.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.revealRequest.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { resolvedAt: "desc" },
      take: REVEAL_HISTORY,
    }),
  ]);
  return {
    sealed,
    pending: pending ? { id: pending.id, at: pending.createdAt.toISOString() } : null,
    reveals: resolved.map(toRevealDTO),
  };
}

export async function createPetition(): Promise<VaultStateDTO> {
  const [sealed, open] = await Promise.all([
    prisma.thought.count({ where: { status: "DRAFT" } }),
    prisma.revealRequest.findFirst({ where: { status: "PENDING" } }),
  ]);
  if (open) throw badRequest("a petition is already pending. the vault is deliberating.");
  if (sealed === 0) throw badRequest("the vault is empty. nothing to petition for.");
  await prisma.revealRequest.create({ data: {} });
  return getVaultState();
}

export async function resolvePetition(
  id: string,
  action: "approve" | "deny",
  thoughtId?: string
): Promise<VaultStateDTO> {
  const petition = await prisma.revealRequest.findUnique({ where: { id } });
  if (!petition) throw notFound("petition");
  if (petition.status !== "PENDING") throw badRequest("that petition was already resolved.");

  if (action === "deny") {
    await prisma.revealRequest.update({
      where: { id },
      data: { status: "DENIED", resolvedAt: new Date() },
    });
    return getVaultState();
  }

  const entry = await prisma.thought.findUnique({ where: { id: thoughtId } });
  if (!entry || entry.status !== "DRAFT") {
    throw badRequest("only a sealed journal entry can be unsealed.");
  }
  await prisma.revealRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      resolvedAt: new Date(),
      revealText: entry.text,
      revealedThoughtAt: entry.createdAt,
    },
  });
  return getVaultState();
}
