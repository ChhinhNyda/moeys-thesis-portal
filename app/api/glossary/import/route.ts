// POST /api/glossary/import — sync glossary terms from a Google Sheet URL.
//
// Accepts { sheetUrl: string } in the body. The URL can be either a
// published-CSV link or a regular sharing link to a spreadsheet that's set
// to "Anyone with the link can view"; we transform the latter into the
// CSV export endpoint.
//
// Dedupe rule: termEnglish is the natural key (case-insensitive, trimmed).
// Matching rows are UPDATED; new rows are CREATED. Rows already in the DB
// but no longer in the sheet are LEFT ALONE — we never delete from sync
// (admin removes them manually if needed).
//
// Required columns (header row): termEnglish, termKhmer.
// Optional: definitionEnglish, definitionKhmer, category.
// Headers are matched loosely — "English", "Term EN", "english term" all
// resolve to termEnglish, so admins don't have to memorise the exact
// casing.
//
// ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireRole } from "../../../../lib/api-auth";

export const dynamic = "force-dynamic";

// Google Sheets URL forms we accept:
//   /spreadsheets/d/{ID}/edit#gid={GID}           ← sharing link
//   /spreadsheets/d/{ID}/edit?usp=sharing         ← sharing link
//   /spreadsheets/d/e/{PUB_ID}/pub?output=csv     ← published-to-web
//   /spreadsheets/d/{ID}/export?format=csv&gid=0  ← already a CSV export
//   any other URL                                 ← fetched as-is
function toCsvUrl(input: string): string {
  const url = input.trim();
  const editMatch = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)\/edit/);
  if (editMatch) {
    const id = editMatch[1];
    const gidMatch = url.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }
  return url;
}

// Minimal RFC 4180-ish CSV parser. Handles quoted fields, embedded commas
// and newlines, and `""` escapes. Returns rows as string[][].
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (c === "\n" || c === "\r") {
        row.push(field);
        field = "";
        // Skip the \n in \r\n
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

// Loose header matching. "Term English", "termEnglish", "english", "EN"
// all resolve to "termEnglish" so admins can use natural sheet headers.
const HEADER_ALIASES: Record<string, string> = {
  termenglish: "termEnglish",
  englishterm: "termEnglish",
  english: "termEnglish",
  termen: "termEnglish",
  en: "termEnglish",
  termkhmer: "termKhmer",
  khmerterm: "termKhmer",
  khmer: "termKhmer",
  termkh: "termKhmer",
  kh: "termKhmer",
  definitionenglish: "definitionEnglish",
  englishdefinition: "definitionEnglish",
  defenglish: "definitionEnglish",
  defen: "definitionEnglish",
  definitionkhmer: "definitionKhmer",
  khmerdefinition: "definitionKhmer",
  defkhmer: "definitionKhmer",
  defkh: "definitionKhmer",
  category: "category",
  cat: "category",
};

function canonicalHeader(h: string): string | null {
  const key = h.toLowerCase().replace(/[^a-z0-9]/g, "");
  return HEADER_ALIASES[key] ?? null;
}

export async function POST(req: Request) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  let body: { sheetUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = (body.sheetUrl ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "sheetUrl is required" }, { status: 400 });
  }

  const csvUrl = toCsvUrl(rawUrl);

  // Fetch with a 30s ceiling so a hung Google response doesn't tie up the
  // request indefinitely. We follow redirects (Google uses a benign 307 to
  // route published sheets through its CDN), then rely on the HTML-detection
  // check further down to distinguish a real CSV body from a login page that
  // would land us here if the sheet isn't publicly shared.
  let csvText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(csvUrl, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch the sheet (HTTP ${res.status}). Make sure the sheet is shared as 'Anyone with the link can view' (or published to the web), and the URL is correct.`,
        },
        { status: 400 }
      );
    }
    csvText = await res.text();
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError"
      ? "Fetching the sheet took longer than 30 seconds; try again."
      : "Network error fetching the sheet.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Google's error pages come back as HTML, not CSV. Reject early with a
  // clear message rather than crashing on the parser.
  if (csvText.trimStart().startsWith("<")) {
    return NextResponse.json(
      {
        error:
          "The URL returned an HTML page instead of CSV. The sheet may be private or the link may be wrong. Open the sheet's Share panel and set access to 'Anyone with the link can view'.",
      },
      { status: 400 }
    );
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "Sheet has no data rows (need a header row plus at least one term)." },
      { status: 400 }
    );
  }

  const headerRow = rows[0];
  const colMap: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    const canon = canonicalHeader(h);
    if (canon && !(canon in colMap)) colMap[canon] = idx;
  });

  if (!("termEnglish" in colMap) || !("termKhmer" in colMap)) {
    return NextResponse.json(
      {
        error:
          "Sheet must have columns for the English term and the Khmer term. Headers seen: " +
          headerRow.join(", "),
      },
      { status: 400 }
    );
  }

  const get = (row: string[], key: string): string => {
    const idx = colMap[key];
    if (idx === undefined) return "";
    return (row[idx] ?? "").trim();
  };

  let imported = 0;
  let updated = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const termEnglish = get(row, "termEnglish");
    const termKhmer = get(row, "termKhmer");

    if (!termEnglish && !termKhmer) continue; // empty row — silently skip
    if (!termEnglish) {
      skipped.push({ row: r + 1, reason: "missing English term" });
      continue;
    }
    if (!termKhmer) {
      skipped.push({ row: r + 1, reason: "missing Khmer term" });
      continue;
    }

    const definitionEnglish = get(row, "definitionEnglish") || null;
    const definitionKhmer = get(row, "definitionKhmer") || null;
    const category = get(row, "category") || null;

    const existing = await prisma.glossaryTerm.findFirst({
      where: { termEnglish: { equals: termEnglish, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      await prisma.glossaryTerm.update({
        where: { id: existing.id },
        data: { termEnglish, termKhmer, definitionEnglish, definitionKhmer, category },
      });
      updated++;
    } else {
      await prisma.glossaryTerm.create({
        data: { termEnglish, termKhmer, definitionEnglish, definitionKhmer, category },
      });
      imported++;
    }
  }

  return NextResponse.json({
    imported,
    updated,
    skipped,
    total: imported + updated,
  });
}
