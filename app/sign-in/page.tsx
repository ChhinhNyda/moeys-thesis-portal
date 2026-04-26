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

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col" style={{ background: C.bg, color: C.ink, fontFamily: "Georgia, serif" }}>
      <header style={{ borderBottom: `1px solid ${C.inkFaint}30`, background: C.surface }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img
              src="/moeys-seal.png"
              alt="Ministry of Education, Youth and Sport seal — return to landing page"
              className="h-12 w-auto"
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                Kingdom of Cambodia
              </p>
              <p className="text-xs" style={{ color: C.inkSoft }}>
                Ministry of Education, Youth and Sport
              </p>
            </div>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <Link
            href="/"
            className="mb-8 inline-block text-sm hover:underline"
            style={{ color: C.primary }}
          >
            ← Back to home
          </Link>

          <h1 className="mb-3 text-4xl" style={{ color: C.ink, fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>Sign</span> in
          </h1>
          <p className="mb-10 text-lg" style={{ color: C.inkSoft }}>
            Choose how you would like to sign in to the National Thesis Archive.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/app"
              className="group rounded-lg p-6 shadow-sm transition-shadow hover:shadow-md"
              style={{
                background: C.surface,
                border: `1px solid ${C.inkFaint}40`,
              }}
            >
              <div
                className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-2xl"
                style={{ background: `${C.primary}15` }}
              >
                🎓
              </div>
              <h2 className="mb-2 text-lg" style={{ color: C.ink, fontWeight: 600 }}>
                Higher Education Institution
              </h2>
              <p className="text-sm" style={{ color: C.inkSoft }}>
                For HEI representatives submitting Master&apos;s and PhD theses to the national archive.
              </p>
            </Link>

            <Link
              href="/app"
              className="group rounded-lg p-6 shadow-sm transition-shadow hover:shadow-md"
              style={{
                background: C.surface,
                border: `1px solid ${C.inkFaint}40`,
              }}
            >
              <div
                className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-2xl"
                style={{ background: `${C.accent}20` }}
              >
                🏛️
              </div>
              <h2 className="mb-2 text-lg" style={{ color: C.ink, fontWeight: 600 }}>
                MoEYS staff
              </h2>
              <p className="text-sm" style={{ color: C.inkSoft }}>
                For ministry reviewers, administrators, and the Minister&apos;s office.
              </p>
            </Link>
          </div>

          <p className="mt-8 text-sm" style={{ color: C.inkFaint }}>
            Don&apos;t have an account? Account provisioning is currently handled by MoEYS — contact your institution&apos;s focal point or the ministry directly.
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
