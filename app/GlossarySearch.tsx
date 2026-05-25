"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

const C = {
  primary: "#0A2A6B",
  bg: "#F7F1E1",
  surface: "#FBF7EC",
  ink: "#2A2018",
  inkSoft: "#5A4A38",
  inkFaint: "#8A7860",
  accent: "#A8761A",
};

type Term = {
  id: string;
  termEnglish: string;
  termKhmer: string;
  definitionEnglish: string | null;
  definitionKhmer: string | null;
  category: string | null;
};

export default function GlossarySearch() {
  const [query, setQuery] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const showResultsPanel = trimmed.length > 0;
  // "No matches" is only meaningful once the latest query has actually
  // been answered by the server — checking searchedFor against trimmed
  // avoids flashing "no results" while a new debounce is pending.
  const noResults =
    !loading && trimmed.length > 0 && searchedFor === trimmed && terms.length === 0;

  // Debounced live search — 250ms after the user stops typing.
  useEffect(() => {
    if (!trimmed) return;
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/glossary/search?q=${encodeURIComponent(trimmed)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setTerms(data.terms ?? []);
          setSearchedFor(trimmed);
        }
      } catch (e) {
        // Aborted fetches are expected when the user keeps typing.
        if ((e as { name?: string } | null)?.name !== "AbortError") {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [trimmed]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 text-center">
        <p className="text-sm font-semibold" style={{ color: C.ink }}>
          Research glossary
        </p>
        <p className="text-sm" style={{ color: C.inkSoft, lineHeight: 1.6 }}>
          Look up common research terms in English or Khmer.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="សន្ទានុក្រមស្រាវជ្រាវ"
          className="w-full rounded-full pl-6 pr-14 py-3.5 text-base shadow-sm focus:outline-none"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${C.inkFaint}80`,
            color: C.ink,
          }}
          aria-label="Search the research glossary"
        />
        <div
          className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
          style={{ color: C.inkFaint }}
          aria-hidden="true"
        >
          <Search size={20} />
        </div>
      </div>

      {showResultsPanel && (
        <div
          className="mt-3 overflow-hidden rounded-md"
          style={{ background: C.surface, border: `1px solid ${C.inkFaint}40` }}
        >
          {loading && terms.length === 0 ? (
            <p className="px-4 py-3 text-sm" style={{ color: C.inkFaint }}>
              Searching…
            </p>
          ) : noResults ? (
            <p className="px-4 py-3 text-sm" style={{ color: C.inkFaint }}>
              No matching terms. Admins can add new entries via the glossary admin page.
            </p>
          ) : terms.length === 0 ? (
            // Initial state: input has text but the debounce hasn't fired yet.
            <p className="px-4 py-3 text-sm" style={{ color: C.inkFaint }}>
              Searching…
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: `${C.inkFaint}30` }}>
              {terms.map((t) => (
                <li key={t.id} className="px-4 py-3 text-left">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-base font-semibold" style={{ color: C.ink }}>
                      {t.termEnglish}
                    </span>
                    <span className="text-base" style={{ color: C.inkSoft }}>
                      · {t.termKhmer}
                    </span>
                    {t.category && (
                      <span
                        className="ml-auto rounded px-2 py-0.5 text-xs"
                        style={{
                          background: C.bg,
                          color: C.accent,
                          border: `1px solid ${C.inkFaint}30`,
                        }}
                      >
                        {t.category}
                      </span>
                    )}
                  </div>
                  {(t.definitionEnglish || t.definitionKhmer) && (
                    <div className="mt-1 space-y-0.5 text-sm" style={{ color: C.inkSoft, lineHeight: 1.55 }}>
                      {t.definitionEnglish && <p>{t.definitionEnglish}</p>}
                      {t.definitionKhmer && <p>{t.definitionKhmer}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
