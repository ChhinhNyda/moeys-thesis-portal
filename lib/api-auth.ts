// Server-side auth helpers used by API route handlers.
//
// Each route handler should start with a call to one of these. They
// return EITHER an early Response (when the request should be rejected)
// OR the authenticated user. Pattern:
//
//   const { error, user } = await requireRole(["ADMIN", "REVIEWER"]);
//   if (error) return error;
//   // ...continue, knowing user is non-null and has one of those roles
//
// Until Slice 3c (this file) the API was honor-system: any client could
// hit any endpoint as long as they knew the URL. Now the session role
// is enforced server-side, regardless of what the role-switcher in the
// UI says.

import { NextResponse } from "next/server";
import { auth } from "./auth";

type Role = "ADMIN" | "REVIEWER" | "HEI_COORDINATOR";

type AuthedUser = {
  id: string;
  email: string;
  role: Role;
  heiId: string | null;
  name?: string | null;
};

type AuthResult =
  | { error: NextResponse; user: null }
  | { error: null; user: AuthedUser };

export async function requireUser(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      user: null,
    };
  }
  return {
    error: null,
    user: {
      id: session.user.id,
      email: session.user.email!,
      role: session.user.role as Role,
      heiId: session.user.heiId,
      name: session.user.name,
    },
  };
}

export async function requireRole(allowed: Role[]): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;
  if (!allowed.includes(result.user.role)) {
    return {
      error: NextResponse.json(
        { error: `Forbidden — this action requires one of: ${allowed.join(", ")}` },
        { status: 403 }
      ),
      user: null,
    };
  }
  return result;
}

// HEI Coordinators can only act on theses for their own institution.
// Returns true if the user is allowed (admin or matching HEI), false otherwise.
export function userOwnsHei(user: AuthedUser, heiId: string): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "HEI_COORDINATOR" && user.heiId === heiId) return true;
  return false;
}
