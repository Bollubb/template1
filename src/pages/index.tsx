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

function safe(v: unknown) {
  return (v ?? "").toString().trim();
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cols = splitCSVLine(row);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj as ContentItem;
  });
}

async function shareOrCopy(url: string) {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({
        title: "NurseDiary",
        url,
      });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      alert("Link copiato negli appunti ✅");
      return;
    }

    // fallback super-basic
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("Link copiato negli appunti ✅");
  } catch (e) {
    // non errore grave
    console.log("Share/copy annullato o fallito", e);
  }
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
  const titolo = safe(item.titolo);
  const categoria = safe(item.categoria);
  const descrizione = safe(item.descrizione);
  const tag = safe(item.tag);
  const tipo = safe(item.tipo);
  const premium = safe(item.premium);

  const href = `/c/${encodeURIComponent(id)}`;

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
              href={href}
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              {titolo}
            </Link>

            {premium && premium.toLowerCase() === "si" && (
              <span
                style={{
                  fontSize: 12,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(165,110,255,0.18)",
                  opacity: 0.95,
                }}
              >
                Premium
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onToggleFavorite(id)}
            aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            title={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: isFavorite ? "rgba(255,210,90,0.18)" : "rgba(0,0,0,0.18)",
              color: "white",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            ⭐
          </button>

          <button
            type="button"
            onClick={() => shareOrCopy(typeof window !== "undefined" ? window.location.origin + href : href)}
            aria-label="Condividi o copia link"
            title="Condividi / copia link"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              color: "white",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            🔗
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.35 }}>{descrizione}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {categoria && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(91,217,255,0.10)",
              opacity: 0.95,
            }}
          >
            {categoria}
          </span>
        )}
        {tipo && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              opacity: 0.9,
            }}
          >
            {tipo}
          </span>
        )}
        {tag && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.16)",
              opacity: 0.9,
            }}
          >
            #{tag}
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <Link
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "white",
            fontSize: 14,
            opacity: 0.95,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.18)",
            padding: "10px 12px",
            borderRadius: 14,
          }}
        >
          Apri contenuto →
        </Link>
      </div>
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

  type TabKey = "home" | "contenuti" | "carte" | "profilo";
  const [activeTab, setActiveTab] = useState<TabKey>("home");

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
    // Se cambio categoria mentre sono in onlyFavorites, resetto la query
    // per evitare combinazioni troppo restrittive.
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

  // ✅ WRAP "CONTENUTI" in una view dedicata (niente più {<header/>} e parentesi strane)
  const ContenutiView = (
    <>
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
                    cursor: "pointer",
                    color: "white",
                    opacity: 0.9,
                    fontSize: 16,
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
                color: "white",
                outline: "none",
                flex: "0 0 180px",
              }}
              aria-label="Seleziona categoria"
            >
              {categorie.map((c) => (
                <option key={c} value={c} style={{ color: "black" }}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              disabled={favoritesCount === 0}
              aria-pressed={onlyFavorites}
              title={favoritesCount === 0 ? "Nessun preferito" : "Mostra solo preferiti"}
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: onlyFavorites ? "rgba(255,210,90,0.20)" : "rgba(0,0,0,0.18)",
                color: "white",
                outline: "none",
                cursor: favoritesCount === 0 ? "not-allowed" : "pointer",
                opacity: favoritesCount === 0 ? 0.55 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              ⭐ Preferiti <span style={{ opacity: 0.85 }}>({favoritesCount})</span>
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
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Prova a cambiare categoria o a rimuovere filtri/ricerca.
            </div>
          </div>
        ) : (
          <>
            {/* sezione preferiti "pinnata" */}
            {favoriteItems.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 16 }}>⭐ Preferiti</h2>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{favoriteItems.length}</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  {favoriteItems.map((it) => (
                    <ContentCard
                      key={safe(it.id)}
                      item={it}
                      isFavorite={favorites.has(safe(it.id))}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                    opacity: 0.85,
                  }}
                />
              </div>
            )}

            {/* resto */}
            {otherItems.map((it) => (
              <ContentCard
                key={safe(it.id)}
                item={it}
                isFavorite={favorites.has(safe(it.id))}
                onToggleFavorite={toggleFavorite}
              />
            ))}

            {/* se non ci sono "otherItems", piccolo placeholder */}
            {otherItems.length === 0 && favoriteItems.length > 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  borderRadius: 16,
                  padding: 14,
                  opacity: 0.9,
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
    </>
  );

  const HomeView = (
  <section style={{ paddingTop: 6 }}>
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: 18,
        background: "rgba(255,255,255,0.04)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(91,217,255,0.10)",
            fontSize: 22,
          }}
        >
          ✨
        </div>
        <div>
          <h2 style={{ margin: 0, letterSpacing: -0.2 }}>Benvenuto in NurseDiary</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.8, lineHeight: 1.35 }}>
            Una biblioteca rapida di contenuti infermieristici: cerca, salva i preferiti e costruisci la tua raccolta.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <span
          style={{
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            opacity: 0.9,
          }}
        >
          Contenuti: <strong style={{ fontWeight: 700 }}>{items.length}</strong>
        </span>

        <span
          style={{
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,210,90,0.12)",
            opacity: 0.95,
          }}
        >
          Preferiti: <strong style={{ fontWeight: 700 }}>{favorites.size}</strong>
        </span>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {/* CTA 1: Azione, non tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("contenuti");
            // micro-UX: portiamo subito il focus sulla ricerca
            setTimeout(() => {
              const el = document.querySelector('input[type="search"]') as HTMLInputElement | null;
              el?.focus();
            }, 50);
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(91,217,255,0.18)",
            color: "white",
            borderRadius: 16,
            padding: "12px 14px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>🔎 Trova subito quello che ti serve</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            Apri la ricerca e inizia a digitare (ECG, PEA, accessi venosi…).
          </div>
        </button>

        {/* CTA 2: se non ha preferiti, invitalo; se li ha, porta a Contenuti + filtro */}
        {favorites.size === 0 ? (
          <button
            type="button"
            onClick={() => setActiveTab("contenuti")}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>⭐ Crea la tua libreria</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Aggiungi i primi preferiti per ritrovarli al volo.
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTab("contenuti");
              setOnlyFavorites(true);
            }}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,210,90,0.14)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>⭐ Apri i tuoi preferiti</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Vai direttamente alla sezione “Preferiti” già filtrata.
            </div>
          </button>
        )}

        {/* CTA 3: teaser Carte (senza “Vai a Carte”) */}
        <button
          type="button"
          onClick={() => setActiveTab("carte")}
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(165,110,255,0.16)",
            color: "white",
            borderRadius: 16,
            padding: "12px 14px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>🃏 Scopri la collezione</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            Le carte arriveranno a breve: prepara lo spazio per la raccolta.
          </div>
        </button>
      </div>
    </div>

    <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.35 }}>
      Suggerimento: usa ⭐ nei contenuti per creare una “lista rapida” delle cose che ti servono più spesso.
    </div>
  </section>
);
function CarteTab() {
  const rarities = [
    { key: "comune", label: "Comune", emoji: "⬜️" },
    { key: "rara", label: "Rara", emoji: "🟦" },
    { key: "epica", label: "Epica", emoji: "🟪" },
    { key: "leggendaria", label: "Leggendaria", emoji: "🟨" },
  ] as const;
//rarity color
  const rarityColors: Record<(typeof rarities)[number]["key"], string> = {
  comune: "rgba(180,180,180,0.75)",
  rara: "rgba(91,217,255,0.85)",
  epica: "rgba(165,110,255,0.90)",
  leggendaria: "rgba(255,210,90,0.95)",
};
 const [pullRarity, setPullRarity] = useState<(typeof rarities)[number] | null>(null);
const [legendFlash, setLegendFlash] = useState(false);
const activeColor = pullRarity ? rarityColors[pullRarity.key] : "rgba(255,255,255,0.20)";

  const slots = Array.from({ length: 12 }, (_, i) => i);

  // ✅ Persistenza (localStorage)
  const [pillole, setPillole] = useState<number>(() => {
    if (typeof window === "undefined") return 120;
    return Number(localStorage.getItem("nd_pillole")) || 120;
  });

  const [lastPull, setLastPull] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("nd_lastPull");
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_pillole", String(pillole));
  }, [pillole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastPull) localStorage.setItem("nd_lastPull", lastPull);
  }, [lastPull]);

  // ✅ Animazione bustina
  const [isOpening, setIsOpening] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [cardLabel, setCardLabel] = useState<string | null>(null);
 



  function demoOpenPack() {
    if (isOpening) return;

    if (pillole < 30) {
      alert("Pillole insufficienti (demo).");
      return;
    }

setIsOpening(true);
setReveal(false);
setCardLabel(null);
setPullRarity(null);
setLegendFlash(false);
setPillole((p) => p - 30);

      // estrazione demo (solo testo)
  const roll = Math.random();
  const pickedRarity =
    roll < 0.7 ? rarities[0] : roll < 0.9 ? rarities[1] : roll < 0.985 ? rarities[2] : rarities[3];

  const demoNames = [
    "Bradicardia",
    "Mobitz I",
    "PEA",
    "Noradrenalina",
    "CVC",
    "Emogas",
    "Accesso venoso difficile",
    "Calze elastocompressive",
    "Pressione venosa centrale",
    "Aminoglicosidi",
    "Cefalosporine",
    "Macrolidi",
  ];

  const name = demoNames[Math.floor(Math.random() * demoNames.length)];
  const result = `${pickedRarity.emoji} ${pickedRarity.label}: ${name}`;

  setCardLabel(result);
  setPullRarity(pickedRarity);

  if (pickedRarity.key === "leggendaria") {
    setLegendFlash(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([40, 30, 40]);
    }
    setTimeout(() => setLegendFlash(false), 700);
  }

    

  function demoDustDuplicates() {
    setPillole((p) => p + 15);
  }

  return (
    <section style={{ paddingTop: 6 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 18,
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(165,110,255,0.14)",
              fontSize: 22,
            }}
          >
            🃏
          </div>
          <div>
            <h2 style={{ margin: 0, letterSpacing: -0.2 }}>Carte</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, lineHeight: 1.35 }}>
              Qui costruirai la tua collezione: bustine, rarità e doppioni (UI demo).
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <span
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              opacity: 0.9,
            }}
          >
            💊 Pillole: <strong style={{ fontWeight: 800 }}>{pillole}</strong>
          </span>

          <span
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.16)",
              opacity: 0.9,
            }}
          >
            Slot collezione: <strong style={{ fontWeight: 800 }}>12</strong>
          </span>

          <span
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(91,217,255,0.10)",
              opacity: 0.95,
            }}
          >
            Bustina (demo): <strong style={{ fontWeight: 800 }}>30</strong> pillole
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {/* PACK ANIMATO */}
         <div
  className={`packwrap ${legendFlash ? "legendFlash" : ""}`}
  style={{
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  }}
>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, letterSpacing: -0.1 }}>Bustina (demo)</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  Premi “Apri” per vedere l’estrazione con animazione.
                </div>
              </div>

              <div
                className={`pack ${isOpening ? "opening" : ""}`}
                style={{
                  width: 86,
                  height: 112,
                  borderRadius: 16,
                  background: `radial-gradient(circle, ${activeColor}, rgba(0,0,0,0))`,
                  border: `1px solid ${activeColor}`,
boxShadow: isOpening
  ? `0 0 0 2px rgba(0,0,0,0.0), 0 0 22px ${activeColor}, 0 20px 60px rgba(0,0,0,0.45)`
  : `0 0 0 1px rgba(255,255,255,0.06), 0 14px 50px rgba(0,0,0,0.30)`,

                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 26, opacity: 0.95 }}>📦</div>

                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    right: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                  }}
                />

                {isOpening && (
                  <div
                    className="glow"
                    style={{
                      position: "absolute",
                      inset: -30,
                      borderRadius: 999,
                      background: "radial-gradient(circle, rgba(165,110,255,0.35), rgba(0,0,0,0))",
                    }}
                  />
                )}
              </div>
            </div>
<div
  style={{
    position: "relative",
    height: 140,
    marginTop: 10,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  }}
>
  {/* “guideline” */}
  <div
    style={{
      position: "absolute",
      left: 12,
      right: 12,
      top: 12,
      height: 1,
      background: "rgba(255,255,255,0.08)",
      opacity: 0.8,
    }}
  />

  {/* CARTA CHE ESCE */}
  <div
    className={`cardpop ${isOpening ? "opening" : ""} ${reveal ? "show" : ""}`}
    style={{
      position: "absolute",
      left: 14,
      right: 14,
      bottom: 14,
      height: 108,
      borderRadius: 16,
      border: `1px solid ${activeColor}`,
      background: `linear-gradient(180deg, ${activeColor}, rgba(0,0,0,0.18))`,
      boxShadow: reveal ? `0 0 28px ${activeColor}, 0 18px 60px rgba(0,0,0,0.45)` : "0 18px 60px rgba(0,0,0,0.45)",
      padding: 12,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>Carta</div>
      <span style={{ fontSize: 12, opacity: 0.75 }}>{pullRarity ? `${pullRarity.emoji} ${pullRarity.label}` : isOpening ? "…" : "Chiusa"}
</span>
    </div>

    <div style={{ fontWeight: 900, lineHeight: 1.2 }}>
      {cardLabel ? cardLabel : isOpening ? "Estrazione in corso…" : "Apri una bustina"}
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {rarities.map((r) => (
        <span
          key={r.key}
          style={{
            fontSize: 11,
            padding: "3px 7px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.14)",
            opacity: 0.7,
          }}
        >
          {r.emoji} {r.label}
        </span>
      ))}
    </div>
  </div>

  {/* Testo “ultima estrazione” persistito */}
  <div
    style={{
      position: "absolute",
      left: 14,
      right: 14,
      top: 18,
      fontSize: 12,
      opacity: 0.75,
    }}
  >
    Ultima: <span style={{ opacity: 0.95 }}>{lastPull ?? "—"}</span>
  </div>
</div>

            </div>
          </div>

          <button
            type="button"
            onClick={demoOpenPack}
            disabled={isOpening}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(165,110,255,0.18)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: isOpening ? "not-allowed" : "pointer",
              opacity: isOpening ? 0.7 : 1,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 900, letterSpacing: -0.1 }}>
              {isOpening ? "📦 Apertura in corso…" : "📦 Apri una bustina (demo)"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Simula un’apertura: riduce pillole e mostra un’estrazione casuale.
            </div>
          </button>

          <button
            type="button"
            onClick={demoDustDuplicates}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,210,90,0.14)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 900, letterSpacing: -0.1 }}>🧪 Distruggi doppioni (demo)</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Aggiunge pillole (placeholder): più avanti useremo il vero inventario.
            </div>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Collezione</h3>
          <div style={{ fontSize: 13, opacity: 0.7 }}>0 / 24 (demo)</div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {slots.map((i) => (
            <div
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(255,255,255,0.03)",
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, letterSpacing: -0.1 }}>Slot #{i + 1}</div>
                <span style={{ fontSize: 12, opacity: 0.7 }}>🔒</span>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8, lineHeight: 1.3 }}>
                Coming soon
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                  Qui comparirà la carta quando la sblocchi.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {rarities.map((r) => (
                  <span
                    key={r.key}
                    style={{
                      fontSize: 11,
                      padding: "3px 7px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.14)",
                      opacity: 0.85,
                    }}
                  >
                    {r.emoji} {r.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 13, lineHeight: 1.35 }}>
          Prossimo step: inventario reale + bustine per espansioni (Antibiotici / Ritmi ECG) e doppioni → pillole.
        </div>
      </div>

      <style jsx>{`
        .pack.opening {
          animation: packShake 520ms ease-in-out;
        }
        .glow {
          animation: glowPulse 520ms ease-in-out;
        }
        @keyframes packShake {
          0% {
            transform: rotate(0deg) translateY(0px);
          }
          20% {
            transform: rotate(-6deg) translateY(-2px);
          }
          40% {
            transform: rotate(6deg) translateY(-1px);
          }
          60% {
            transform: rotate(-4deg) translateY(-2px);
          }
          80% {
            transform: rotate(4deg) translateY(-1px);
          }
          100% {
            transform: rotate(0deg) translateY(0px);
          }
        }
        @keyframes glowPulse {
          0% {
            opacity: 0.2;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.25;
            transform: scale(1);
          }
        }
      `
          .packwrap.legendFlash {
  animation: legendFlash 700ms ease-in-out;
}

@keyframes legendFlash {
  0% { box-shadow: 0 0 0 rgba(0,0,0,0); }
  20% { box-shadow: 0 0 0 2px rgba(255,210,90,0.25), 0 0 40px rgba(255,210,90,0.85); }
  45% { box-shadow: 0 0 0 2px rgba(255,255,255,0.25), 0 0 60px rgba(255,255,255,0.75); }
  70% { box-shadow: 0 0 0 2px rgba(255,210,90,0.22), 0 0 35px rgba(255,210,90,0.70); }
  100% { box-shadow: 0 0 0 rgba(0,0,0,0); }
}
}
.cardpop {
  transform: translateY(0px);
  opacity: 0.92;
  transition: opacity 220ms ease;
}

/* durante apertura: la carta sale */
.cardpop.opening {
  animation: cardOut 520ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

/* quando reveal true, la carta resta “fuori” */
.cardpop.show {
  transform: translateY(-36px);
  opacity: 1;
}

@keyframes cardOut {
  0% {
    transform: translateY(0px);
  }
  65% {
    transform: translateY(-44px);
  }
  85% {
    transform: translateY(-32px);
  }
  100% {
    transform: translateY(-36px);
  }
}

</style>
    </section>
  );
}

// nel punto dove definisci le view:
const CarteView = <CarteTab />;


  const ProfiloView = (
    <section style={{ paddingTop: 6 }}>
      <h2 style={{ margin: 0, marginBottom: 10 }}>👤 Profilo</h2>
      <p style={{ margin: 0, opacity: 0.8 }}>Profilo (placeholder, non loggato - scelta B)</p>
    </section>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return HomeView;
      case "contenuti":
        return ContenutiView;
      case "carte":
        return CarteView;
      case "profilo":
        return ProfiloView;
      default:
        return HomeView;
    }
  };

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
        padding: "28px 16px 110px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* overlay per leggibilità */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,12,18,0.72), rgba(10,12,18,0.55))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>{renderActiveTab()}</div>

      <nav
        aria-label="Navigazione principale"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 14,
          width: "min(1080px, calc(100% - 24px))",
          zIndex: 50,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,12,18,0.65)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: 10,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {([
          ["home", "🏠", "Home"],
          ["contenuti", "📚", "Contenuti"],
          ["carte", "🃏", "Carte"],
          ["profilo", "👤", "Profilo"],
        ] as const).map(([key, icon, label]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: isActive ? "rgba(91,217,255,0.18)" : "rgba(0,0,0,0.18)",
                color: "white",
                borderRadius: 14,
                padding: "10px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              {isActive && <span style={{ fontSize: 13, opacity: 0.95 }}>{label}</span>}
            </button>
          );
        })}
      </nav>
    </main>
  );
}


