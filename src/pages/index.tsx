import { useEffect, useMemo, useState } from "react";
import Link from "next/link";


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

function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // gestisce "" come virgolette escape
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

function parseCSV(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cols = splitCSVLine(row);
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj;
  });
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
    backgroundImage: "url('/background-main.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    overflow: "hidden",
    minHeight: "100vh",
    borderRadius: 24,
    maxWidth: 1080,
    margin: "0 auto",
    padding: "28px 16px 48px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  }}
>
    {/* overlay per leggibilità */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(10,12,18,0.72), rgba(10,12,18,0.55))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        pointerEvents: "none",
      }}
    />
    <div style={{ position: "relative", zIndex: 1 }}>

 <header
  style={{
    position: "sticky",
    top: 0,
    zIndex: 20,
    marginBottom: 18,
    paddingTop: 8,
    paddingBottom: 12,
    background: "rgba(10,12,18,0.55)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  }}
>
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
      <div style={{ position: "relative", flex: "1 1 280px" }}>
  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Cerca (es. ECG, PEA, accesso venoso...)"
    style={{
      width: "100%",
      padding: "12px 36px 12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.18)",
      outline: "none",
    }}
  />

  {query && (
    <button
      onClick={() => setQuery("")}
      aria-label="Cancella ricerca"
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        color: "rgba(255,255,255,0.6)",
        fontSize: 16,
        cursor: "pointer",
      }}
    >
      ✕
    </button>
  )}
</div>


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
    paddingTop: 10,
  }}
>
  {filtered.length === 0 ? (
    <div
      style={{
        gridColumn: "1 / -1",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        opacity: 0.9,
      }}
    >
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        Nessun contenuto trovato.
      </div>

      <div
        style={{
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        Prova a cambiare categoria o usa parole più generiche (es. “ECG”, “shock”, “accesso”).
      </div>

      <button
        onClick={() => {
          setQuery("");
          setCategoria("Tutte");
        }}
        style={{
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.18)",
          cursor: "pointer",
        }}
      >
        Reset filtri
      </button>
    </div>
  ) : (
    filtered.map((i) => (
      <article
        key={safe(i.id)}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: 16,
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "baseline",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <Link
              href={`/c/${encodeURIComponent(safe(i.id))}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>{safe(i.titolo)}</h2>
            </Link>

            <span style={{ fontSize: 12, opacity: 0.6 }}>{safe(i.categoria)}</span>
          </div>

          {safe(i.premium).toUpperCase() === "TRUE" && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
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

        <Link
          href={`/c/${encodeURIComponent(safe(i.id))}`}
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            textDecoration: "none",
          }}
        >
          Apri contenuto
        </Link>
      </article>
    ))
  )}
</section>
      <div style={{ height: 800 }} />
          </div>
  </main>
);


}
