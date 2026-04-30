// Type augmentation so session.user.role / heiId / id are typed across
// the codebase. Auth.js v5 reads this automatically.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "REVIEWER" | "HEI_COORDINATOR";
      heiId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "REVIEWER" | "HEI_COORDINATOR";
    heiId?: string | null;
  }
}
