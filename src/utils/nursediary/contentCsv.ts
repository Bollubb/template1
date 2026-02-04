// src/utils/nursediary/contentCsv.ts
import type { ContentItem } from "../../types/nursediary/types";

function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

export function parseContentCSV(csvText: string): ContentItem[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cols = splitCSVLine(row);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });

    // Cast controllato: il tuo CSV ha già le colonne che matchano ContentItem
    return obj as unknown as ContentItem;
  });
}

export async function fetchContentItems(): Promise<ContentItem[]> {
  const res = await fetch("/contenuti.csv", { cache: "no-store" });
  const text = await res.text();
  return parseContentCSV(text);
}
