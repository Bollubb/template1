import type { ContentItem } from "@/types/nursediary/types";

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
  return out.map((s) => s.trim());
}

export function parseContentCSV(csv: string): ContentItem[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => header.indexOf(key);

  const idI = idx("id");
  const titoloI = idx("titolo");
  const categoriaI = idx("categoria");
  const tagI = idx("tag");
  const descrizioneI = idx("descrizione");
  const contenutoI = idx("contenuto");
  const linkI = idx("link");
  const premiumI = idx("premium");

  return lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const premiumRaw = premiumI >= 0 ? cols[premiumI] : "";
    const premium = premiumRaw === "1" || premiumRaw?.toLowerCase() === "true" || premiumRaw?.toLowerCase() === "yes";
    return {
      id: idI >= 0 ? cols[idI] : cryptoRandomId(),
      titolo: titoloI >= 0 ? cols[titoloI] : "",
      categoria: categoriaI >= 0 ? cols[categoriaI] : "Generale",
      tag: tagI >= 0 ? cols[tagI] : "",
      descrizione: descrizioneI >= 0 ? cols[descrizioneI] : "",
      contenuto: contenutoI >= 0 ? cols[contenutoI] : "",
      link: linkI >= 0 ? cols[linkI] : "",
      premium,
    } satisfies ContentItem;
  });
}

function cryptoRandomId(): string {
  try {
    // @ts-ignore
    return (crypto?.randomUUID?.() as string) || String(Math.random()).slice(2);
  } catch {
    return String(Math.random()).slice(2);
  }
}
