// GET /api/cron/release-embargoes
// Daily job. Flips approved theses from METADATA_ONLY to PUBLIC once their
// publicReleaseAt has passed. Triggered by Vercel Cron — see vercel.json.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Anyone
// hitting this without the right header gets 401, so the only way for a
// thesis to flip visibility is via this scheduled job (or admin tooling).

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.thesis.updateMany({
    where: {
      status: "APPROVED",
      visibility: "METADATA_ONLY",
      publicReleaseAt: { lte: now },
    },
    data: { visibility: "PUBLIC" },
  });

  return NextResponse.json({
    released: result.count,
    at: now.toISOString(),
  });
}
