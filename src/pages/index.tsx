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
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 12,
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(91,217,255,0.35), rgba(165,110,255,0.35))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        />
        <h1 style={{ fontSize: 30, margin: 0, letterSpacing: -0.4 }}>NurseDiary</h1>
      </div>

      <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.35, maxWidth: 760 }}>
        Biblioteca rapida di contenuti infermieristici. Cerca per titolo/tag e filtra per categoria.
      </p>
    </div>

    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        opacity: 0.85,
        fontSize: 12,
      }}
    >
      <span
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {items.length} contenuti
      </span>
      <span
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        Salvabili • Condivisibili
      </span>
    </div>
  </div>

  <div
    style={{
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      padding: 12,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
    }}
  >
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
</header>


        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca (es. ECG, PEA, accesso venoso...)"
            style={{
              flex: "1 1 260px",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              outline: "none",
            }}
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              outline: "none",
            }}
          >
            {categorie.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {filtered.map((i) => {
          const isPremium = safe(i.premium).toUpperCase() === "TRUE";
          const tags = safe(i.tag)
            .split(";")
            .join(",")
            .split("|")
            .join(",")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

          return (
            <article
              key={safe(i.id)}
              style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
  backdropFilter: "blur(10px)",
}}

            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>{safe(i.titolo) || "Senza titolo"}</h2>
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {safe(i.categoria) || "—"} {isPremium ? "• Premium" : ""}
                </span>
              </div>

              {safe(i.descrizione) ? (
                <p style={{ marginTop: 10, marginBottom: 10, opacity: 0.8, lineHeight: 1.3 }}>
                  {safe(i.descrizione)}
                </p>
              ) : null}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {tags.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      opacity: 0.85,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {safe(i.link) ? (
                <a
                  href={safe(i.link)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    textDecoration: "none",
                  }}
                >
                  Apri contenuto
                </a>
              ) : (
                <span style={{ fontSize: 12, opacity: 0.6 }}>Nessun link</span>
              )}
            </article>
          );
        })}
      </section>

      <footer style={{ marginTop: 18, opacity: 0.6, fontSize: 12 }}>
        Elementi mostrati: {filtered.length} / {items.length}
      </footer>
    </main>
  );
}
