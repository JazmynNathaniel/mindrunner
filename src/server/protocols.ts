import { prisma } from "./db";
import { badRequest, forbidden, notFound } from "./errors";
import type { Dish, DishStateDTO, ProtocolsStateDTO } from "@/lib/types";

/**
 * CHICKEN PROTOCOLS — selfie mechanics. Each dish names a person (HONEY = the
 * owner, JERK = the recipient), so you press the OTHER dish and you upload
 * only your OWN. Pressing unseals the oldest stashed selfie instantly; a bare
 * stash opens a live demand that blares on the subject's side until an upload
 * fulfills it. Rules:
 *   - selfie bytes never leave the server except through /api/selfie/[id],
 *     which serves UNSEALED images to authenticated sessions only
 *   - one open demand per dish; the presser may rescind it
 *   - purge: the owner purges anything; the recipient only his own face
 */

/** Whose face a role uploads (you are your own dish). */
export const dishOfRole = (role: string): Dish => (role === "ADMIN" ? "HONEY" : "JERK");

/** Who is allowed to press a dish's button (the one craving the other). */
const presserRole = (dish: Dish): string => (dish === "HONEY" ? "RECIPIENT" : "ADMIN");

const isPresser = (dish: Dish, role: string) =>
  (role === "ADMIN" ? "ADMIN" : "RECIPIENT") === presserRole(dish);

const MAX_BYTES = 2 * 1024 * 1024; // post-shrink safety cap, well under Vercel's body limit
const MIMES = new Set(["image/webp", "image/jpeg", "image/png"]);

async function dishState(dish: Dish): Promise<DishStateDTO> {
  const [stock, demand, latest, unsealedCount] = await Promise.all([
    prisma.selfie.count({ where: { dish, unsealedAt: null } }),
    prisma.selfieDemand.findFirst({ where: { dish, metAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.selfie.findFirst({
      where: { dish, unsealedAt: { not: null } },
      orderBy: { unsealedAt: "desc" },
      select: { id: true, unsealedAt: true },
    }),
    prisma.selfie.count({ where: { dish, unsealedAt: { not: null } } }),
  ]);
  return {
    dish,
    stock,
    demand: demand ? { id: demand.id, at: demand.createdAt.toISOString() } : null,
    latest: latest ? { id: latest.id, at: latest.unsealedAt!.toISOString() } : null,
    unsealedCount,
  };
}

export async function getProtocolsState(): Promise<ProtocolsStateDTO> {
  const [honey, jerk] = await Promise.all([dishState("HONEY"), dishState("JERK")]);
  return { honey, jerk };
}

/**
 * Press a protocol: unseal the OLDEST stashed selfie (the subject curates the
 * order by stocking chronologically), or open a demand if the stash is bare.
 * `unlocked` tells the client whether it should rain immediately or wait.
 */
export async function pressProtocol(
  dish: Dish,
  role: string
): Promise<{ protocols: ProtocolsStateDTO; unlocked: boolean }> {
  if (!isPresser(dish, role)) {
    throw forbidden("you cannot demand your own dish. that is just a mirror.");
  }
  const open = await prisma.selfieDemand.findFirst({ where: { dish, metAt: null } });
  if (open) throw badRequest("the demand is already blaring. patience.");

  const next = await prisma.selfie.findFirst({
    where: { dish, unsealedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  let unlocked = false;
  if (next) {
    await prisma.selfie.update({ where: { id: next.id }, data: { unsealedAt: new Date() } });
    unlocked = true;
  } else {
    await prisma.selfieDemand.create({ data: { dish } });
  }
  return { protocols: await getProtocolsState(), unlocked };
}

/** The presser withdraws their own unanswered demand. */
export async function rescindDemand(dish: Dish, role: string): Promise<ProtocolsStateDTO> {
  if (!isPresser(dish, role)) throw forbidden("that demand is not yours to withdraw.");
  const open = await prisma.selfieDemand.findFirst({ where: { dish, metAt: null } });
  if (!open) throw notFound("demand");
  await prisma.selfieDemand.delete({ where: { id: open.id } });
  return getProtocolsState();
}

/**
 * Upload your own face. An open demand for your dish is fulfilled immediately
 * (the selfie unseals on arrival); otherwise the selfie stocks the stash.
 */
export async function addSelfie(
  role: string,
  mime: string,
  bytes: Uint8Array<ArrayBuffer>
): Promise<ProtocolsStateDTO> {
  if (!MIMES.has(mime)) throw badRequest("unreadable image format. webp, jpeg or png only.");
  if (bytes.length === 0) throw badRequest("the image arrived empty.");
  if (bytes.length > MAX_BYTES) {
    throw badRequest("image too large. the shrink ray appears to have failed.");
  }
  const dish = dishOfRole(role);
  const open = await prisma.selfieDemand.findFirst({
    where: { dish, metAt: null },
    orderBy: { createdAt: "asc" },
  });
  await prisma.selfie.create({
    data: { dish, mime, bytes, unsealedAt: open ? new Date() : null },
  });
  if (open) {
    await prisma.selfieDemand.update({ where: { id: open.id }, data: { metAt: new Date() } });
  }
  return getProtocolsState();
}

/** Serve one UNSEALED selfie's bytes. Sealed stash items are nobody's to view. */
export async function getUnsealedSelfie(id: string) {
  const s = await prisma.selfie.findUnique({ where: { id } });
  if (!s || !s.unsealedAt) throw notFound("selfie");
  return { mime: s.mime, bytes: s.bytes };
}

export async function purgeSelfie(id: string, role: string): Promise<ProtocolsStateDTO> {
  const s = await prisma.selfie.findUnique({ where: { id }, select: { dish: true } });
  if (!s) throw notFound("selfie");
  if (role !== "ADMIN" && s.dish !== dishOfRole(role)) {
    throw forbidden("that face is not yours to purge.");
  }
  await prisma.selfie.delete({ where: { id } });
  return getProtocolsState();
}
