/**
 * Rotate an account password (there is deliberately no in-app password UI).
 * Usage: npx tsx scripts/set-password.ts <username> <new-password>
 * Also revokes that user's active sessions.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 12) {
  console.error("usage: npx tsx scripts/set-password.ts <username> <new-password>  (min 12 chars)");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: { username },
    data: {
      passwordHash: bcrypt.hashSync(password, 12),
      sessions: { deleteMany: {} },
    },
  });
  console.log(`password updated and sessions revoked for ${username}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
