// /api/heis — admin endpoints for HEI management.
//
// POST → create a new institution. ADMIN only.
//
// (GET intentionally not implemented — every page that needs HEIs reads
// them server-side via prisma.hei.findMany. Keeping GET out reduces
// surface area.)

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireRole } from "../../../lib/api-auth";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["PUBLIC", "PRIVATE", "INTERNATIONAL"] as const;

function mapTypeFromUi(t: string | undefined): "PUBLIC" | "PRIVATE" | "INTERNATIONAL" {
  if (t === "International") return "INTERNATIONAL";
  if (t === "Private") return "PRIVATE";
  return "PUBLIC";
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

  const shortCode = String(body.shortCode || body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const nameKhmer = body.nameKhmer || body.nameKh ? String(body.nameKhmer || body.nameKh).trim() : null;
  const type = mapTypeFromUi(body.type as string | undefined);
  const ministry = body.ministry ? String(body.ministry).trim() : "MoEYS";
  const city = body.city ? String(body.city).trim() : null;
  const contactEmail = body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null;

  if (!shortCode) return NextResponse.json({ error: "Short code is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const existing = await prisma.hei.findUnique({ where: { shortCode } });
  if (existing) {
    return NextResponse.json({ error: `HEI code '${shortCode}' is already in use` }, { status: 409 });
  }

  const created = await prisma.hei.create({
    data: { shortCode, name, nameKhmer, type, ministry, city, contactEmail, isActive: true },
    select: { id: true, shortCode: true, name: true },
  });
  return NextResponse.json({ hei: created });
}
