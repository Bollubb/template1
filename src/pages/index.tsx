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

function safe(v: any) {
  return typeof v === "string" ? v : "";
}

function ContentCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: ContentItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const id = safe(item.id);
const [copied, setCopied] = useState(false);

async function handleShare() {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${encodeURIComponent(id)}`
      : `/c/${encodeURIComponent(id)}`;

  const title = safe(item.titolo) || "NurseDiary";
  const text = safe(item.descrizione) || "Contenuto NurseDiary";

  try {
    // Web Share API (mobile)
    // @ts-ignore
    if (navigator.share) {
      // @ts-ignore
      await navigator.share({ title, text, url });
      return;
    }

    // Fallback: copia link
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      // fallback vecchio stile
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  } catch (e) {
    // Se l’utente annulla la share, non è un errore grave
    console.log("Share/copy annullato o fallito", e);
  }
}
  return (
    <article
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={`/c/${encodeURIComponent(id)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>{safe(item.titolo)}</h2>
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(id);
              }}
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              title={isFavorite ? "Preferito" : "Aggiungi ai preferiti"}
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.18)",
                borderRadius: 999,
                padding: "2px 8px",
                cursor: "pointer",
                lineHeight: 1.2,
                opacity: isFavorite ? 1 : 0.75,
              }}
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleShare();
  }}
  aria-label={copied ? "Link copiato" : "Condividi"}
  title={copied ? "Link copiato ✓" : "Condividi"}
  style={{
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 999,
    padding: "2px 8px",
    cursor: "pointer",
    lineHeight: 1.2,
    opacity: copied ? 1 : 0.85,
  }}
>
  {copied ? "✓" : "🔗"}
</button>
          </div>

          <span style={{ fontSize: 12, opacity: 0.6 }}>{safe(item.categoria)}</span>
        </div>

        {safe(item.premium).toUpperCase() === "TRUE" && (
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

      <p style={{ opacity: 0.8, lineHeight: 1.4 }}>{safe(item.descrizione)}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        {safe(item.tag)
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
        href={`/c/${encodeURIComponent(id)}`}
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
  );
}

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Tutte");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const favoritesCount = favorites.size;

  // Se sei in "solo preferiti" e diventano 0, esci automaticamente
  useEffect(() => {
    if (onlyFavorites && favorites.size === 0) {
      setOnlyFavorites(false);
    }
  }, [onlyFavorites, favorites]);

  // Carica CSV contenuti
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/contenuti.csv", { cache: "no-store" });
        const text = await res.text();
        const parsed = parseCSV(text) as ContentItem[];
        setItems(parsed);
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, []);

  // Carica preferiti da localStorage (una sola volta)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nd_favorites");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setFavorites(new Set(arr));
    } catch (e) {
      console.error("Errore lettura preferiti", e);
    }
  }, []);

  // Salva preferiti in localStorage (ogni volta che cambiano)
  useEffect(() => {
    try {
      localStorage.setItem("nd_favorites", JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.error("Errore salvataggio preferiti", e);
    }
  }, [favorites]);
  
  useEffect(() => {
  // se sto filtrando per categoria, lascio stare.
  // se torno su "Tutte", non tocco nulla.
  // Se cambio categoria mentre sono in onlyFavorites, tengo onlyFavorites,
  // ma resetto la query per evitare combinazioni troppo restrittive.
  // (se non lo vuoi, dimmelo e lo togliamo)
  if (onlyFavorites && query.length > 0) {
    setQuery("");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [categoria]);


  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      const favOk = !onlyFavorites || favorites.has(safe(i.id));

      const hay = `${safe(i.titolo)} ${safe(i.descrizione)} ${safe(i.tag)} ${safe(i.tipo)}`.toLowerCase();
      const qOk = !q || hay.includes(q);

      return catOk && qOk && favOk;
    });
  }, [items, query, categoria, onlyFavorites, favorites]);

  const favoriteItems = useMemo(() => {
    return filtered.filter((i) => favorites.has(safe(i.id)));
  }, [filtered, favorites]);

  const otherItems = useMemo(() => {
    return filtered.filter((i) => !favorites.has(safe(i.id)));
  }, [filtered, favorites]);

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
                  background:
                    "linear-gradient(90deg, rgba(91,217,255,1), rgba(165,110,255,1))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  boxShadow: "0 8px 30px rgba(91,217,255,0.25)",
                }}
              >
                NurseDiary
              </h1>
            </div>

            <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.35 }}>
              Biblioteca rapida di contenuti infermieristici. Cerca per titolo/tag e filtra per
              categoria.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  spellCheck={false}
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
                    type="button"
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
                  color: "white",
                }}
              >
                {categorie.map((c) => (
<option key={c} value={c} style={{ color: "black" }}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={favoritesCount === 0}
                onClick={() => {
                  if (favoritesCount === 0) return;
                  setOnlyFavorites((v) => !v);
                }}
                aria-pressed={onlyFavorites}
                title={favoritesCount === 0 ? "Nessun preferito salvato" : "Mostra solo preferiti"}
                style={{
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    favoritesCount === 0
                      ? "rgba(0,0,0,0.10)"
                      : onlyFavorites
                      ? "rgba(255,215,0,0.25)"
                      : "rgba(0,0,0,0.18)",
                  cursor: favoritesCount === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  opacity: favoritesCount === 0 ? 0.5 : 1,
                }}
              >
                ⭐ Preferiti ({favoritesCount})
              </button>
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
              <div style={{ fontSize: 14, marginBottom: 8 }}>Nessun contenuto trovato.</div>

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
                type="button"
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
            <>
              {favoriteItems.length > 0 && (
                <div style={{ gridColumn: "1 / -1", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>⭐ Preferiti</div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    {favoriteItems.map((i) => (
                      <ContentCard
                        key={safe(i.id)}
                        item={i}
                        isFavorite={favorites.has(safe(i.id))}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.10)",
                      borderRadius: 999,
                      marginBottom: 14,
                    }}
                  />
                </div>
              )}

              {otherItems.length > 0 ? (
                otherItems.map((i) => (
                  <ContentCard
                    key={safe(i.id)}
                    item={i}
                    isFavorite={favorites.has(safe(i.id))}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    opacity: 0.8,
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  Nessun altro contenuto oltre ai preferiti.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}


