// /api/glossary — admin endpoints for the research glossary.
//
// GET  → list all terms (admin only — public consumers use /search).
// POST → create a new term. ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireRole } from "../../../lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const terms = await prisma.glossaryTerm.findMany({
    orderBy: [{ termEnglish: "asc" }],
  });
  return NextResponse.json({ terms });
}

export async function POST(req: Request) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const termEnglish = String(body.termEnglish ?? "").trim();
  const termKhmer = String(body.termKhmer ?? "").trim();
  if (!termEnglish) return NextResponse.json({ error: "English term is required" }, { status: 400 });
  if (!termKhmer) return NextResponse.json({ error: "Khmer term is required" }, { status: 400 });

  const definitionEnglish = body.definitionEnglish ? String(body.definitionEnglish).trim() || null : null;
  const definitionKhmer = body.definitionKhmer ? String(body.definitionKhmer).trim() || null : null;
  const category = body.category ? String(body.category).trim() || null : null;

  const created = await prisma.glossaryTerm.create({
    data: { termEnglish, termKhmer, definitionEnglish, definitionKhmer, category },
  });
  return NextResponse.json({ term: created });
}
