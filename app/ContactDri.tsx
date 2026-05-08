"use client";

import { useState } from "react";

const DRI_EMAIL = "chhinh.nyda@moeys.gov.kh";
const DRI_SUBJECT = "Thesis deposit — Cambodian scholar abroad";

const C = {
  primary: "#0A2A6B",
  bg: "#F7F1E1",
  surface: "#FBF7EC",
  ink: "#2A2018",
  inkSoft: "#5A4A38",
  inkFaint: "#8A7860",
};

export default function ContactDri() {
  const [copied, setCopied] = useState(false);

  const subject = encodeURIComponent(DRI_SUBJECT);
  const to = encodeURIComponent(DRI_EMAIL);
  const links: { label: string; href: string }[] = [
    { label: "Gmail", href: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}` },
    { label: "Outlook web", href: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}` },
    { label: "Yahoo Mail", href: `https://compose.mail.yahoo.com/?to=${to}&subject=${subject}` },
    { label: "Default mail app", href: `mailto:${DRI_EMAIL}?subject=${subject}` },
  ];

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(DRI_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-copy via temp textarea (older browsers / insecure contexts)
      const ta = document.createElement("textarea");
      ta.value = DRI_EMAIL;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <details className="mt-4 inline-block text-left">
      <summary
        className="inline-block cursor-pointer rounded-md px-4 py-2 text-sm font-semibold"
        style={{ color: C.primary, border: `1.5px solid ${C.primary}`, listStyle: "none" }}
      >
        Email DRI →
      </summary>
      <div
        className="mt-3 rounded-md p-4 text-sm"
        style={{ background: C.surface, border: `1px solid ${C.inkFaint}40` }}
      >
        <p className="mb-3" style={{ color: C.inkSoft }}>
          Open a pre-filled message in your preferred mail service:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="rounded-md px-3 py-1.5 font-semibold transition-opacity hover:opacity-90"
              style={{ background: C.primary, color: C.bg }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span style={{ color: C.inkFaint }}>Or copy the address:</span>
          <span
            className="rounded px-2 py-1"
            style={{ background: C.bg, color: C.ink, fontWeight: 600, border: `1px solid ${C.inkFaint}30` }}
          >
            {DRI_EMAIL}
          </span>
          <button
            type="button"
            onClick={copyAddress}
            className="rounded-md px-3 py-1 font-semibold transition-opacity hover:opacity-90"
            style={{ background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
    </details>
  );
}
