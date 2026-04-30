// Seed the initial user accounts for the pilot. Idempotent — re-running
// will not duplicate rows; existing emails are left untouched.
//
// Run:  npx tsx scripts/seed-users.ts

import "dotenv/config";
import { prisma } from "../lib/prisma";

const USERS = [
  { email: "chhinhnyda@gmail.com",    role: "ADMIN" as const,            name: "MoEYS Admin",       heiCode: null },
  { email: "reviewer@moeys.gov.kh",   role: "REVIEWER" as const,         name: "DRI Reviewer",      heiCode: null },
  { email: "library@rupp.edu.kh",     role: "HEI_COORDINATOR" as const,  name: "RUPP Coordinator",  heiCode: "RUPP" },
  { email: "research@itc.edu.kh",     role: "HEI_COORDINATOR" as const,  name: "ITC Coordinator",   heiCode: "ITC" },
  { email: "research@rua.edu.kh",     role: "HEI_COORDINATOR" as const,  name: "RUA Coordinator",   heiCode: "RUA" },
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
