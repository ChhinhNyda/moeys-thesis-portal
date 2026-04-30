import Link from "next/link";

const C = {
  primary: "#0A2A6B",
  bg: "#F7F1E1",
  surface: "#FBF7EC",
  ink: "#2A2018",
  inkSoft: "#5A4A38",
  inkFaint: "#8A7860",
  accent: "#A8761A",
};

// Shown after the user submits their email on /sign-in. Auth.js redirects
// here with verifyRequest — the link in the email is what completes the
// sign-in.
export default function CheckEmailPage() {
  return (
    <div className="flex flex-1 flex-col" style={{ background: C.bg, color: C.ink, fontFamily: "Georgia, serif" }}>
      <header style={{ borderBottom: `1px solid ${C.inkFaint}30`, background: C.surface }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img src="/moeys-seal.png" alt="MoEYS seal" className="h-12 w-auto" />
            <div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Kingdom of Cambodia</p>
              <p className="text-xs" style={{ color: C.inkSoft }}>Ministry of Education, Youth and Sport</p>
            </div>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-lg px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center mb-6" style={{ width: 72, height: 72, borderRadius: "50%", background: `${C.accent}20`, color: C.accent, fontSize: 32 }}>
            ✉
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl" style={{ color: C.ink, fontWeight: 400 }}>
            Check your <span style={{ fontStyle: "italic", fontWeight: 300 }}>email</span>
          </h1>
          <p className="text-base mb-3" style={{ color: C.inkSoft, lineHeight: 1.6 }}>
            We sent a sign-in link to your email address.
          </p>
          <p className="text-sm" style={{ color: C.inkFaint, lineHeight: 1.6 }}>
            Click the link in that email to sign in. The link expires in 24 hours.
          </p>
          <p className="mt-10 text-sm" style={{ color: C.inkFaint }}>
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <Link href="/sign-in" style={{ color: C.primary, textDecoration: "underline" }}>try again</Link>.
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
