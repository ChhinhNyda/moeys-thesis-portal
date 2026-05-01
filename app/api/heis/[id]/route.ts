// PATCH /api/heis/[id] — edit an existing HEI's fields.
//
// shortCode is editable but with care — every existing thesis references
// the HEI by its primary key (heiId), not by shortCode, so changing the
// code does not break references. Be conservative anyway: surface the
// risk in the UI hint.
//
// ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireRole } from "../../../../lib/api-auth";

export const dynamic = "force-dynamic";

function mapTypeFromUi(t: string | undefined): "PUBLIC" | "PRIVATE" | "INTERNATIONAL" {
  if (t === "International") return "INTERNATIONAL";
  if (t === "Private") return "PRIVATE";
  return "PUBLIC";
}

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

  const target = await prisma.hei.findUnique({ where: { id }, select: { id: true, shortCode: true } });
  if (!target) return NextResponse.json({ error: "HEI not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.nameKhmer !== undefined) {
    const v = body.nameKhmer ? String(body.nameKhmer).trim() : null;
    data.nameKhmer = v || null;
  }
  if (typeof body.shortCode === "string" && body.shortCode.trim()) {
    const newCode = body.shortCode.trim().toUpperCase();
    if (newCode !== target.shortCode) {
      const clash = await prisma.hei.findUnique({ where: { shortCode: newCode } });
      if (clash) return NextResponse.json({ error: `Short code '${newCode}' already exists` }, { status: 409 });
      data.shortCode = newCode;
    }
  }
  if (typeof body.type === "string") data.type = mapTypeFromUi(body.type);
  if (typeof body.ministry === "string" && body.ministry.trim()) data.ministry = body.ministry.trim();
  if (body.city !== undefined) data.city = body.city ? String(body.city).trim() : null;
  if (body.contactEmail !== undefined) {
    data.contactEmail = body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.hei.update({
    where: { id },
    data,
    select: { id: true, shortCode: true, name: true },
  });
  return NextResponse.json({ hei: updated });
}
