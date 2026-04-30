import Link from "next/link";
import { signIn } from "../../lib/auth";

const C = {
  primary: "#0A2A6B",
  bg: "#F7F1E1",
  surface: "#FBF7EC",
  ink: "#2A2018",
  inkSoft: "#5A4A38",
  inkFaint: "#8A7860",
  accent: "#A8761A",
  red: "#A41E2C",
};

// Sign-in is a Server Component that calls Auth.js's signIn() in a server
// action when the form posts. No client JS required.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function sendMagicLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: "/app" });
  }

  return (
    <div className="flex flex-1 flex-col" style={{ background: C.bg, color: C.ink, fontFamily: "Georgia, serif" }}>
      <header style={{ borderBottom: `1px solid ${C.inkFaint}30`, background: C.surface }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img src="/moeys-seal.png" alt="MoEYS seal — return to landing" className="h-12 w-auto" />
            <div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Kingdom of Cambodia</p>
              <p className="text-xs" style={{ color: C.inkSoft }}>Ministry of Education, Youth and Sport</p>
            </div>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-md px-6 py-16">
          <Link href="/" className="mb-8 inline-block text-sm hover:underline" style={{ color: C.primary }}>
            ← Back to home
          </Link>

          <h1 className="mb-3 text-4xl" style={{ color: C.ink, fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>Sign</span> in
          </h1>
          <p className="mb-8 text-base" style={{ color: C.inkSoft, lineHeight: 1.6 }}>
            Enter your email and we&apos;ll send you a secure sign-in link. No password needed.
          </p>

          {error && (
            <div className="mb-6 rounded-md p-4 text-sm" style={{ background: `${C.red}15`, borderLeft: `3px solid ${C.red}`, color: C.ink }}>
              {error === "AccessDenied"
                ? "Your account is not authorised to sign in. Contact MoEYS DRI if you believe this is wrong."
                : "Couldn't send the sign-in link. Please try again."}
            </div>
          )}

          <form action={sendMagicLink} className="rounded-lg p-6 space-y-4" style={{ background: C.surface, border: `1px solid ${C.inkFaint}40` }}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold mb-2" style={{ color: C.inkSoft, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@institution.edu.kh"
                className="w-full rounded-md px-4 py-3 text-base"
                style={{ background: C.bg, border: `1px solid ${C.inkFaint}80`, color: C.ink }}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md px-6 py-3 font-semibold transition-opacity hover:opacity-90"
              style={{ background: C.primary, color: C.bg }}
            >
              Send sign-in link
            </button>
          </form>

          <p className="mt-8 text-sm" style={{ color: C.inkFaint }}>
            Don&apos;t have an account? Account provisioning is handled by MoEYS — contact your institution&apos;s focal point or the ministry directly.
          </p>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.inkFaint}30` }}>
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm" style={{ color: C.inkFaint }}>
          <p>© 2026 Ministry of Education, Youth and Sport · Pilot programme</p>
        </div>
      </footer>
    </div>
  );
}
