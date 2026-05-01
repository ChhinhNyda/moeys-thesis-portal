import Link from "next/link";
import { prisma } from "../lib/prisma";

// Re-fetch the live counts on every request so the landing page reflects
// the latest archive size as soon as a thesis is approved.
export const dynamic = "force-dynamic";

// Cambodian palette — keep these in sync with /preview-colors and the /app
// StyleTag. See the deep-research notes in the conversation memory for why
// each color was chosen (flag PMS 293 navy, restrained seal red, parchment
// cream, royal/temple gold).
const C = {
  primary: "#0A2A6B",
  secondary: "#A41E2C",
  bg: "#F7F1E1",
  surface: "#FBF7EC",
  ink: "#2A2018",
  inkSoft: "#5A4A38",
  inkFaint: "#8A7860",
  accent: "#A8761A",
};

export default async function LandingPage() {
  const [thesesCount, heisCount] = await Promise.all([
    prisma.thesis.count({ where: { status: "APPROVED" } }),
    prisma.hei.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="flex flex-1 flex-col" style={{ background: C.bg, color: C.ink, fontFamily: "Georgia, serif" }}>
      <header style={{ borderBottom: `1px solid ${C.inkFaint}30`, background: C.surface }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <img
            src="/moeys-seal.png"
            alt="Ministry of Education, Youth and Sport seal"
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
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center">
          <div
            className="mb-4 text-xs font-semibold"
            style={{
              color: C.inkFaint,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            National Archive · Pilot programme
          </div>
          <h1
            className="mb-5 text-5xl md:text-6xl"
            style={{ color: C.ink, fontWeight: 400, lineHeight: 1.1 }}
          >
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>The</span>{" "}
            National Thesis Archive
          </h1>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg"
            style={{ color: C.inkSoft, lineHeight: 1.6 }}
          >
            A central catalogue of Master&apos;s and PhD theses from accredited
            Cambodian higher education institutions.
          </p>

          <form action="/app" method="GET" className="mx-auto mb-8 max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                placeholder="Search by title, author, or keyword…"
                className="flex-1 rounded-md px-4 py-3 text-base"
                style={{
                  background: C.surface,
                  border: `1px solid ${C.inkFaint}80`,
                  color: C.ink,
                }}
              />
              <button
                type="submit"
                className="rounded-md px-6 py-3 font-semibold transition-opacity hover:opacity-90"
                style={{ background: C.primary, color: C.bg }}
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/app"
              className="rounded-md px-7 py-3 font-semibold shadow-sm transition-opacity hover:opacity-90"
              style={{ background: C.primary, color: C.bg }}
            >
              Browse theses
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md px-7 py-3 font-semibold transition-colors"
              style={{
                background: "transparent",
                color: C.primary,
                border: `2px solid ${C.primary}`,
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          background: C.surface,
          borderTop: `1px solid ${C.inkFaint}30`,
          borderBottom: `1px solid ${C.inkFaint}30`,
        }}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 text-center md:grid-cols-3">
          <div>
            <p className="text-4xl" style={{ color: C.ink, fontWeight: 500 }}>
              {thesesCount}
            </p>
            <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>
              theses archived
            </p>
          </div>
          <div>
            <p className="text-4xl" style={{ color: C.ink, fontWeight: 500 }}>
              {heisCount}
            </p>
            <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>
              participating HEIs
            </p>
          </div>
          <div>
            <p className="text-4xl" style={{ color: C.accent, fontWeight: 500 }}>
              MoEYS
            </p>
            <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>
              quality assured
            </p>
          </div>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${C.inkFaint}30` }}>
        <div className="mx-auto max-w-4xl px-6 py-12 text-center">
          <p className="text-sm font-semibold mb-2" style={{ color: C.ink }}>
            Studied abroad?
          </p>
          <p className="text-sm" style={{ color: C.inkSoft, lineHeight: 1.6 }}>
            Cambodian scholars who completed their thesis at a foreign institution may deposit their work with the National Archive.{" "}
            <a href="mailto:chhinh.nyda@moeys.gov.kh" style={{ color: C.primary, fontWeight: 600, textDecoration: "underline" }}>
              Email DRI →
            </a>
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
