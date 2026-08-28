import { prisma } from "./db";
import type { AdminOperatorVitalsDTO, OperatorVitalsDTO } from "@/lib/types";

// The operator needs ~8 coolant refills per cycle. Fiction-approved medicine.
export const COOLANT_TARGET = 8;

/**
 * "Today" for operator vitals is defined in the owner's timezone
 * (America/New_York). We find the UTC instant of ET midnight by probing both
 * possible offsets (EST = UTC-5, EDT = UTC-4) and keeping the one that
 * formats back to hour 00 in ET — correct across DST transitions.
 */
function startOfTodayET(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = ymd.split("-").map(Number);
  for (const offset of [5, 4]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, offset));
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(candidate);
    if (hour === "00" || hour === "24") return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d, 5));
}

export async function getOperatorVitals(): Promise<OperatorVitalsDTO> {
  const since = startOfTodayET();
  const [water, foods] = await Promise.all([
    prisma.operatorEvent.count({ where: { kind: "WATER", createdAt: { gte: since } } }),
    prisma.operatorEvent.findMany({
      where: { kind: "FOOD", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const last = foods[0];
  return {
    coolant: { today: water, target: COOLANT_TARGET },
    packetsToday: foods.length,
    lastPacket:
      last && last.payload
        ? { at: last.createdAt.toISOString(), payload: last.payload }
        : null,
  };
}

export async function getAdminOperatorVitals(): Promise<AdminOperatorVitalsDTO> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [vitals, pings] = await Promise.all([
    getOperatorVitals(),
    prisma.operatorEvent.findMany({
      where: { kind: "PING", createdAt: { gte: dayAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { ...vitals, pings: pings.map((p) => p.createdAt.toISOString()) };
}

export async function logCoolant(): Promise<void> {
  await prisma.operatorEvent.create({ data: { kind: "WATER" } });
}

/** Misclick eraser: removes the newest refill logged today (if any). */
export async function undoCoolant(): Promise<void> {
  const latest = await prisma.operatorEvent.findFirst({
    where: { kind: "WATER", createdAt: { gte: startOfTodayET() } },
    orderBy: { createdAt: "desc" },
  });
  if (latest) await prisma.operatorEvent.delete({ where: { id: latest.id } });
}

export async function logPacket(payload: string): Promise<void> {
  await prisma.operatorEvent.create({ data: { kind: "FOOD", payload } });
}

/** The recipient's hydration nudge. */
export async function createPing(): Promise<void> {
  await prisma.operatorEvent.create({ data: { kind: "PING" } });
}
