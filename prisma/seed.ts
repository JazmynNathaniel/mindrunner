import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(username: string, password: string, role: "ADMIN" | "RECIPIENT") {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    // never overwrite an existing password on reseed
    update: { role },
    create: { username, passwordHash, role },
  });
}

async function main() {
  const adminUser = process.env.ADMIN_USERNAME ?? "jaz";
  const recipUser = process.env.RECIPIENT_USERNAME ?? "him";
  const adminPass = process.env.ADMIN_PASSWORD;
  const recipPass = process.env.RECIPIENT_PASSWORD;

  if (!adminPass || !recipPass) {
    console.warn(
      "⚠ ADMIN_PASSWORD / RECIPIENT_PASSWORD not set — falling back to dev defaults. CHANGE BEFORE DEPLOYING."
    );
  }

  await upsertUser(adminUser, adminPass ?? "brainos-dev-admin", "ADMIN");
  await upsertUser(recipUser, recipPass ?? "brainos-dev-recipient", "RECIPIENT");

  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await prisma.nowPlaying.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await prisma.diagnostics.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // Sample content so the terminal has something to show in dev. Only on an empty DB.
  const thoughtCount = await prisma.thought.count();
  if (thoughtCount === 0) {
    const lung = await prisma.song.create({
      data: { artist: "Hiatus Kaiyote", title: "The Lung", album: "Tawk Tomahawk" },
    });
    await prisma.thought.create({
      data: {
        text: "you are becoming a recurring process in my operating system.",
        status: "QUEUED",
        category: "flirty",
        tags: JSON.stringify(["him"]),
        queuePosition: 1,
        songId: lung.id,
      },
    });
    await prisma.thought.create({
      data: {
        text: "why does my brain compile its best ideas at 2:14 AM and garbage-collect them by morning?",
        status: "QUEUED",
        category: "late-night",
        tags: JSON.stringify(["programming", "late-night"]),
        queuePosition: 2,
      },
    });
    await prisma.nowPlaying.update({ where: { id: 1 }, data: { songId: lung.id } });
    console.log("seeded 2 queued thoughts + now playing");
  }

  console.log("seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
