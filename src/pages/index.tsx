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
function categoryColor(cat: string) {
  const c = (cat || "").toLowerCase().trim();
  if (c.includes("ecg")) return "rgba(91,217,255,0.22)";
  if (c.includes("emergen")) return "rgba(255,120,180,0.18)";
  if (c.includes("farm")) return "rgba(165,110,255,0.18)";
  if (c.includes("proced")) return "rgba(0,255,180,0.14)";
  if (c.includes("check")) return "rgba(255,210,100,0.16)";
  if (c.includes("carte")) return "rgba(255,255,255,0.10)";
  return "rgba(255,255,255,0.10)";
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
      background: "radial-gradient(900px 450px at 20% 0%, rgba(91,217,255,0.16), transparent 60%), radial-gradient(900px 450px at 85% 10%, rgba(165,110,255,0.14), transparent 60%), radial-gradient(900px 450px at 50% 100%, rgba(0,255,180,0.10), transparent 55%)",
minHeight: "100vh",
borderRadius: 24,
 maxWidth: 1080,
      margin: "0 auto",
      padding: "28px 16px 48px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    }}
  >
  <header style={{ marginBottom: 18 }}>
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
  <img
    src="/logo.png"
    alt="NurseDiary"
    style={{
  width: 84,
  height: 84,
  borderRadius: "50%",
  objectFit: "cover",
  background: "rgba(255,255,255,0.10)",
  padding: 6,
  border: "1px solid rgba(255,255,255,0.22)",
}}
  />
  <h1
    style={{
      margin: 0,
      letterSpacing: -0.3,
      background: "linear-gradient(90deg, rgba(91,217,255,1), rgba(165,110,255,1))",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      boxShadow: "0 8px 30px rgba(91,217,255,0.25)",
    }}
  >
    NurseDiary
  </h1>
</div>
    <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.35 }}>
      Biblioteca rapida di contenuti infermieristici. Cerca per titolo/tag e filtra per categoria.
    </p>

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca (es. ECG, PEA, accesso venoso...)"
        style={{
          flex: "1 1 280px",
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.18)",
          outline: "none",
        }}
      />

      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        style={{
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.18)",
          outline: "none",
          minWidth: 160,
        }}
      >
        {categorie.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, opacity: 0.75, fontSize: 12 }}>
      <span
  style={{
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
   background: "rgba(255,255,255,0.10)",
    opacity: 0.95,
    whiteSpace: "nowrap",
  }}
>
</span>

    </div>
  </div>
</header>
 <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
      }}
    >
      {filtered.map((i) => (
        <article key={safe(i.id)}
          style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
}}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
  <h2 style={{ marginTop: 0, marginBottom: 0 }}>{safe(i.titolo)}</h2>
  <span style={{ fontSize: 12, opacity: 0.6 }}>
    {safe(i.categoria)}
  </span>
</div>
  {safe(i.premium).toUpperCase() === "TRUE" && (
    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)" }}>
      Premium 🔒
    </span>
  )}
</div>
<div style={{ height: 8 }} />

          <p style={{ opacity: 0.8, lineHeight: 1.4 }}>{safe(i.descrizione)}</p>

<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
  {safe(i.tag)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (
      <span
        key={t}
        style={{
          fontSize: 12,
          padding: "4px 8px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          opacity: 0.8,
        }}
      >
        {t}
      </span>
    ))}
</div>
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
                border: "1px solid rgba(255,255,255,0.25)",
background: "rgba(255,255,255,0.06)",

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
