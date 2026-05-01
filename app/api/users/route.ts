// /api/users — admin endpoints for user management.
//
// GET   → list all users (admin sees everyone, including inactive)
// POST  → create a new user (typical use: onboarding an abroad scholar)
//
// Both restricted to ADMIN. The prototype's role switcher used to be the
// only "user management" tool; now real users have rows in the User
// table and admins manage them through this endpoint.

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireRole } from "../../../lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      hei: { select: { id: true, shortCode: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { email: "asc" }],
  });
  return NextResponse.json({ users });
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

  const email = String(body.email || "").trim().toLowerCase();
  const name = body.name ? String(body.name).trim() : null;
  const role = body.role as "ADMIN" | "REVIEWER" | "HEI_COORDINATOR";
  const heiCode = body.heiCode ? String(body.heiCode).trim() : null;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (!["ADMIN", "REVIEWER", "HEI_COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Role must be ADMIN, REVIEWER, or HEI_COORDINATOR" }, { status: 400 });
  }

  let heiId: string | null = null;
  if (role === "HEI_COORDINATOR") {
    if (!heiCode) {
      return NextResponse.json({ error: "HEI is required for HEI Coordinators" }, { status: 400 });
    }
    const hei = await prisma.hei.findUnique({ where: { shortCode: heiCode } });
    if (!hei) return NextResponse.json({ error: `HEI '${heiCode}' not found` }, { status: 404 });
    heiId = hei.id;
  }

  // Reactivate an existing inactive row if present (e.g., someone who
  // tried to self-sign-up before — don't create a duplicate).
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { name, role, heiId, isActive: true },
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated, reactivated: true });
  }

  const created = await prisma.user.create({
    data: { email, name, role, heiId, isActive: true },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ user: created, reactivated: false });
}
