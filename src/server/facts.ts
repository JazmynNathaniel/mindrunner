import type { FunFact } from "@prisma/client";
import { prisma } from "./db";
import { forbidden, notFound } from "./errors";
import type { FactsPageDTO, FunFactDTO } from "@/lib/types";

/**
 * DECLASSIFIED INTEL — fun facts neither side would tell the general public.
 * One shared feed, no sealing, no expiry: confessing IS the feature. Rules:
 *   - both accounts post; the sender is derived from the session role
 *   - the recipient can reclassify (delete) only his own facts
 *   - the owner can purge anything (her kill switch, as everywhere else)
 */

const FEED_SIZE = 60;

const senderForRole = (role: string): FunFactDTO["sender"] =>
  role === "ADMIN" ? "OWNER" : "RECIPIENT";

function toDTO(f: FunFact): FunFactDTO {
  return {
    id: f.id,
    text: f.text,
    sender: f.sender as FunFactDTO["sender"],
    at: f.createdAt.toISOString(),
  };
}

/** Latest facts (newest first) plus the size of the whole file. */
export async function listFacts(): Promise<FactsPageDTO> {
  const [rows, total] = await Promise.all([
    prisma.funFact.findMany({ orderBy: { createdAt: "desc" }, take: FEED_SIZE }),
    prisma.funFact.count(),
  ]);
  return { facts: rows.map(toDTO), total };
}

export async function createFact(text: string, role: string): Promise<FactsPageDTO> {
  await prisma.funFact.create({ data: { text, sender: senderForRole(role) } });
  return listFacts();
}

export async function deleteFact(id: string, role: string): Promise<FactsPageDTO> {
  const fact = await prisma.funFact.findUnique({ where: { id } });
  if (!fact) throw notFound("intel");
  if (role !== "ADMIN" && fact.sender !== "RECIPIENT") {
    throw forbidden("that intel is not yours to reclassify.");
  }
  await prisma.funFact.delete({ where: { id } });
  return listFacts();
}
