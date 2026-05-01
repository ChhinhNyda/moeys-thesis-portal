// Auth.js (NextAuth v5) config — email magic-link login backed by Resend.
// Sessions are stored in Postgres via the Prisma adapter so we can attach
// role + heiId to the session payload. Authors do not log in here; only
// MoEYS Admin, MoEYS Reviewer, and HEI Coordinator accounts.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./prisma";
import { sendMagicLinkEmail } from "./email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Resend({
      from: process.env.RESEND_FROM_ADDRESS || "noreply@thesis-pilot.wesoben.com",
      apiKey: process.env.RESEND_API_KEY,
      // Custom email sender — uses our shared Cambodian-palette template
      // instead of next-auth's default plain-text stub.
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await sendMagicLinkEmail({ to: email, url });
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
    error: "/sign-in",
  },
  callbacks: {
    // Extend the session payload with role + heiId so client code can
    // gate UI without an extra DB query. Custom fields are typed via
    // module augmentation in types/next-auth.d.ts.
    async session({ session, user }) {
      if (session.user) {
        const u = user as typeof user & { role: "ADMIN" | "REVIEWER" | "HEI_COORDINATOR"; heiId: string | null };
        session.user.role = u.role;
        session.user.heiId = u.heiId;
        session.user.id = user.id;
      }
      return session;
    },
    // Invitation-only sign-in. Two rejection cases:
    // - Unknown email — never provisioned by an admin. Magic-link
    //   verification still runs (Auth.js's adapter creates a User row),
    //   but isActive defaults to false at the schema level, so this
    //   check rejects them. The orphaned row stays in the User table
    //   for admin visibility ("people who tried to sign up").
    // - Known email but explicitly deactivated by admin.
    // Auth.js redirects rejected sign-ins to /sign-in?error=AccessDenied,
    // which the sign-in page renders with a "contact DRI" message.
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      });
      if (!dbUser || !dbUser.isActive) return false;
      return true;
    },
  },
});
