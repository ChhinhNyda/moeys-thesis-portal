// Seed the initial user accounts for the pilot. Idempotent — re-running
// will not duplicate rows; existing emails are left untouched.
//
// Run:  npx tsx scripts/seed-users.ts

import "dotenv/config";
import { prisma } from "../lib/prisma";

const USERS = [
  { email: "chhinhnyda@gmail.com",    role: "ADMIN" as const,            name: "MoEYS Admin",        heiCode: null },
  { email: "sophal.khl@gmail.com",    role: "REVIEWER" as const,         name: "Sophal Khl",         heiCode: null },
  { email: "piseyry88@gmail.com",     role: "HEI_COORDINATOR" as const,  name: "Pisey RY (RUPP)",    heiCode: "RUPP" },
  { email: "nyda.chhinh@gmail.com",   role: "HEI_COORDINATOR" as const,  name: "Nyda Chhinh (ITC)",  heiCode: "ITC" },
  // RUA Coordinator not yet assigned — add a row here when the
  // institution names a focal point.
];

async function main() {
  for (const u of USERS) {
    let heiId: string | null = null;
    if (u.heiCode) {
      const hei = await prisma.hei.findUnique({ where: { shortCode: u.heiCode } });
      if (!hei) {
        console.error(`  ✗ HEI ${u.heiCode} not found — skipping ${u.email}`);
        continue;
      }
      heiId = hei.id;
    }
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, heiId, isActive: true },
      create: { email: u.email, role: u.role, name: u.name, heiId, isActive: true },
    });
    console.log(`  ✓ ${u.email}  → ${u.role}${u.heiCode ? ` (${u.heiCode})` : ""}`);
  }
  console.log("\nDone. Sign in with any of these addresses on /sign-in.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
