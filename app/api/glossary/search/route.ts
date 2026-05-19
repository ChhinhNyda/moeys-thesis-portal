// GET /api/glossary/search?q=<query>
//
// Public — anyone can search. Returns up to 20 glossary terms matching
// the query in either the English or the Khmer side, plus a best-effort
// match in either definition. Case-insensitive substring match — the
// glossary is small (hundreds at most) so a full-table scan is fine for
// now; revisit if it grows past a few thousand rows.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ terms: [] });

  const terms = await prisma.glossaryTerm.findMany({
    where: {
      OR: [
        { termEnglish: { contains: q, mode: "insensitive" } },
        { termKhmer: { contains: q } },
        { definitionEnglish: { contains: q, mode: "insensitive" } },
        { definitionKhmer: { contains: q } },
      ],
    },
    orderBy: [{ termEnglish: "asc" }],
    take: MAX_RESULTS,
    select: {
      id: true,
      termEnglish: true,
      termKhmer: true,
      definitionEnglish: true,
      definitionKhmer: true,
      category: true,
    },
  });

  return NextResponse.json({ terms });
}
