import { useEffect, useMemo, useState } from "react";

type ContentItem = {
  id: string;
  titolo: string;
  categoria: string;
  tag: string;
  descrizione: string;
  contenuto: string;
  link: string;
  immagine: string;
  tipo: string;
  premium: string;
};

function parseCSV(csvText: string): ContentItem[] {
  // CSV semplice: separatore virgola, senza virgolette complesse.
  // Se in futuro metti virgole nei testi lunghi, ti dirò come migliorarlo.
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1);

  const items: ContentItem[] = rows.map((row) => {
    const cols = row.split(",").map((c) => c.trim());
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj as ContentItem;
  });

  // Filtra righe senza id/titolo
  return items.filter((x) => (x.id || "").lengthPure() !== 0);
}

// Piccolo helper per evitare crash se mancano campi
function safe(v: any) {
  return typeof v === "string" ? v : "";
}

// Hack: typescript non conosce lengthPure, lo facciamo noi
declare global {
  interface String {
    lengthPure(): number;
  }
}
// @ts-ignore
String.prototype.lengthPure = function () {
  return String(this).trim().length;
};

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Tutte");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/contenuti.csv", { cache: "no-store" });
        const text = await res.text();
        const parsed = parseCSV(text);
        setItems(parsed);
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, []);

  const categorie = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const c = safe(i.categoria).trim();
      if (c) set.add(c);
    });
    return ["Tutte", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const catOk = categoria === "Tutte" || safe(i.categoria) === categoria;
      const hay =
        `${safe(i.titolo)} ${safe(i.descrizione)} ${safe(i.tag)} ${safe(i.tipo)}`.toLowerCase();
      const qOk = !q || hay.includes(q);
      return catOk && qOk;
    });
  }, [items, query, categoria]);

return (
  <main
    style={{
      maxWidth: 1080,
      margin: "0 auto",
      padding: "28px 16px 48px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    }}
  >
    <header style={{ marginBottom: 18 }}>
      <h1 style={{ margin: 0 }}>NurseDiary</h1>
      <p style={{ opacity: 0.7 }}>
        Biblioteca rapida di contenuti infermieristici
      </p>
    </header>

    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
      }}
    >
      {filtered.map((i) => (
        <article
          key={safe(i.id)}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{safe(i.titolo)}</h2>
          <p style={{ opacity: 0.8 }}>{safe(i.descrizione)}</p>

          {safe(i.link) && (
            <a
              href={safe(i.link)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                textDecoration: "none",
              }}
            >
              Apri contenuto
            </a>
          )}
        </article>
      ))}
    </section>
  </main>
);


}
