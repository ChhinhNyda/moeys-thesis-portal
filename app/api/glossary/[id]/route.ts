// PATCH/DELETE /api/glossary/[id] — edit or remove a single glossary term.
// ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireRole } from "../../../../lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.glossaryTerm.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Term not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.termEnglish === "string" && body.termEnglish.trim()) data.termEnglish = body.termEnglish.trim();
  if (typeof body.termKhmer === "string" && body.termKhmer.trim()) data.termKhmer = body.termKhmer.trim();
  if (body.definitionEnglish !== undefined) {
    const v = body.definitionEnglish ? String(body.definitionEnglish).trim() : null;
    data.definitionEnglish = v || null;
  }
  if (body.definitionKhmer !== undefined) {
    const v = body.definitionKhmer ? String(body.definitionKhmer).trim() : null;
    data.definitionKhmer = v || null;
  }
  if (body.category !== undefined) {
    const v = body.category ? String(body.category).trim() : null;
    data.category = v || null;
  }

  const updated = await prisma.glossaryTerm.update({ where: { id }, data });
  return NextResponse.json({ term: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const target = await prisma.glossaryTerm.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Term not found" }, { status: 404 });

  await prisma.glossaryTerm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
