// Temporary preview page — shows the proposed Cambodian palette applied
// to typical landing-page elements so the user can see it in context
// before committing. Delete this folder once a decision is made.

const PALETTE = {
  primary: { hex: "#0A2A6B", role: "Primary (royal navy, flag PMS 293)" },
  secondary: { hex: "#A41E2C", role: "Secondary (seal red, restrained flag PMS 032)" },
  background: { hex: "#F7F1E1", role: "Background (parchment cream)" },
  surface: { hex: "#FBF7EC", role: "Surface (card cream)" },
  ink: { hex: "#2A2018", role: "Ink (warm brown-black, body text)" },
  inkSoft: { hex: "#5A4A38", role: "Ink-soft (Khmer-bronze)" },
  inkFaint: { hex: "#8A7860", role: "Ink-faint (faded bronze)" },
  accent: { hex: "#A8761A", role: "Accent (royal/temple gold)" },
  success: { hex: "#2E6B3E", role: "Success (forest green)" },
  warning: { hex: "#B8771A", role: "Warning" },
  danger: { hex: "#A41E2C", role: "Danger (reuses seal red)" },
};

export default function PreviewColors() {
  return (
    <div style={{ background: PALETTE.background.hex, minHeight: "100vh", color: PALETTE.ink.hex, fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${PALETTE.inkFaint.hex}40`, background: PALETTE.surface.hex }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/moeys-seal.png" alt="" style={{ height: 48 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: PALETTE.ink.hex }}>Kingdom of Cambodia</div>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft.hex }}>Ministry of Education, Youth and Sport</div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "96px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: PALETTE.inkFaint.hex, marginBottom: 16 }}>
            National Archive · Pilot programme
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.1, color: PALETTE.ink.hex, marginBottom: 16 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>The</span> National Thesis Archive
          </h1>
          <p style={{ fontSize: 18, color: PALETTE.inkSoft.hex, maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.5 }}>
            A central catalogue of Master&apos;s and PhD theses from accredited Cambodian higher education institutions.
          </p>

          {/* Search bar mock */}
          <div style={{ maxWidth: 560, margin: "0 auto 24px", display: "flex", gap: 8 }}>
            <input
              placeholder="Search by title, author, or keyword…"
              style={{
                flex: 1,
                padding: "14px 16px",
                fontSize: 16,
                background: PALETTE.surface.hex,
                border: `1px solid ${PALETTE.inkFaint.hex}80`,
                borderRadius: 6,
                color: PALETTE.ink.hex,
              }}
            />
            <button style={{ padding: "14px 24px", fontSize: 16, fontWeight: 600, background: PALETTE.primary.hex, color: PALETTE.background.hex, border: "none", borderRadius: 6, cursor: "pointer" }}>
              Search
            </button>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ padding: "12px 28px", fontSize: 15, fontWeight: 600, background: PALETTE.primary.hex, color: PALETTE.background.hex, border: "none", borderRadius: 6 }}>
              Browse theses
            </button>
            <button style={{ padding: "12px 28px", fontSize: 15, fontWeight: 600, background: "transparent", color: PALETTE.primary.hex, border: `2px solid ${PALETTE.primary.hex}`, borderRadius: 6 }}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: PALETTE.surface.hex, borderTop: `1px solid ${PALETTE.inkFaint.hex}30`, borderBottom: `1px solid ${PALETTE.inkFaint.hex}30`, padding: "48px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 48, fontWeight: 500, color: PALETTE.ink.hex }}>6</div>
            <div style={{ fontSize: 13, color: PALETTE.inkSoft.hex, marginTop: 4 }}>theses archived</div>
          </div>
          <div>
            <div style={{ fontSize: 48, fontWeight: 500, color: PALETTE.ink.hex }}>3</div>
            <div style={{ fontSize: 13, color: PALETTE.inkSoft.hex, marginTop: 4 }}>participating HEIs</div>
          </div>
          <div>
            <div style={{ fontSize: 48, fontWeight: 500, color: PALETTE.accent.hex }}>MoEYS</div>
            <div style={{ fontSize: 13, color: PALETTE.inkSoft.hex, marginTop: 4 }}>quality assured</div>
          </div>
        </div>
      </section>

      {/* Sample card with badges */}
      <section style={{ padding: "64px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: PALETTE.inkFaint.hex, marginBottom: 12 }}>Sample thesis card</div>
          <div style={{ background: PALETTE.surface.hex, border: `1px solid ${PALETTE.inkFaint.hex}40`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <span style={{ background: PALETTE.success.hex, color: PALETTE.background.hex, fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 600 }}>APPROVED</span>
              <span style={{ background: PALETTE.accent.hex, color: PALETTE.background.hex, fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 600 }}>Doctorate</span>
              <span style={{ fontSize: 12, color: PALETTE.inkFaint.hex, fontFamily: "monospace" }}>RUPP-PHD-2024-042</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6, color: PALETTE.ink.hex }}>
              Khmer Linguistic Patterns in Modern Social Media Discourse
            </h3>
            <div style={{ fontSize: 14, color: PALETTE.inkSoft.hex, marginBottom: 12 }}>Channary Pich · 2024</div>
            <p style={{ fontSize: 14, color: PALETTE.inkSoft.hex, lineHeight: 1.5 }}>
              An ethnographic analysis of Khmer language usage across Facebook and Telegram public discourse, examining shifts in formality, code-switching, and emergent neologisms.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: PALETTE.primary.hex, color: PALETTE.background.hex, border: "none", borderRadius: 4 }}>
                Download PDF
              </button>
              <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "transparent", color: PALETTE.primary.hex, border: `1px solid ${PALETTE.primary.hex}80`, borderRadius: 4 }}>
                View details
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Status messages */}
      <section style={{ padding: "0 32px 64px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: PALETTE.inkFaint.hex, marginBottom: 12 }}>System messages</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: `${PALETTE.success.hex}15`, borderLeft: `3px solid ${PALETTE.success.hex}`, padding: 16, borderRadius: 4, color: PALETTE.ink.hex }}>
              ✓ Thesis submitted to MoEYS for review.
            </div>
            <div style={{ background: `${PALETTE.warning.hex}15`, borderLeft: `3px solid ${PALETTE.warning.hex}`, padding: 16, borderRadius: 4, color: PALETTE.ink.hex }}>
              ⚠ Embargo will expire in 14 days — public release on 2026-05-10.
            </div>
            <div style={{ background: `${PALETTE.danger.hex}15`, borderLeft: `3px solid ${PALETTE.danger.hex}`, padding: 16, borderRadius: 4, color: PALETTE.ink.hex }}>
              ✗ Submission failed: similarity score above acceptable threshold.
            </div>
          </div>
        </div>
      </section>

      {/* Palette swatches */}
      <section style={{ padding: "64px 32px", background: PALETTE.surface.hex, borderTop: `1px solid ${PALETTE.inkFaint.hex}30` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: PALETTE.inkFaint.hex, marginBottom: 16 }}>Full palette</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {Object.entries(PALETTE).map(([key, p]) => (
              <div key={key} style={{ border: `1px solid ${PALETTE.inkFaint.hex}40`, borderRadius: 6, overflow: "hidden", background: PALETTE.background.hex }}>
                <div style={{ background: p.hex, height: 80 }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: PALETTE.ink.hex }}>{p.hex}</div>
                  <div style={{ fontSize: 11, color: PALETTE.inkSoft.hex, marginTop: 4 }}>{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: "24px 32px", textAlign: "center", color: PALETTE.inkFaint.hex, fontSize: 12 }}>
        Preview only · /preview-colors · delete this folder once a decision is made
      </footer>
    </div>
  );
}
