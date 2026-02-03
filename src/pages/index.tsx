import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type RarityKey = "comune" | "rara" | "epica" | "leggendaria";

type CardDef = {
  id: string;
  name: string;
  rarity: RarityKey;
  image: string;
  set: "antibiotici";
};

const RARITY_COLORS: Record<RarityKey, string> = {
  comune: "rgba(180,180,180,0.9)",
  rara: "rgba(91,217,255,0.95)",
  epica: "rgba(165,110,255,0.95)",
  leggendaria: "rgba(255,210,90,1)",
};

const CARDS: CardDef[] = [
  { id: "aminoglicosidi", name: "Aminoglicosidi", rarity: "rara", image: "/cards/antibiotici-aminoglicosidi.png", set: "antibiotici" },
  { id: "carbapenemi", name: "Carbapenemi", rarity: "epica", image: "/cards/antibiotici-carbapenemi.png", set: "antibiotici" },
  { id: "penicilline", name: "Penicilline", rarity: "comune", image: "/cards/antibiotici-penicilline.png", set: "antibiotici" },
  { id: "cefalosporine", name: "Cefalosporine", rarity: "comune", image: "/cards/antibiotici-cefalosporine.png", set: "antibiotici" },
  { id: "fluorochinoloni", name: "Fluorochinoloni", rarity: "rara", image: "/cards/antibiotici-fluorochinoloni.png", set: "antibiotici" },
  { id: "glicopeptidi", name: "Glicopeptidi", rarity: "rara", image: "/cards/antibiotici-glicopeptidi.png", set: "antibiotici" },
  { id: "lincosamidi", name: "Lincosamidi", rarity: "epica", image: "/cards/antibiotici-lincosamidi.png", set: "antibiotici" },
  { id: "macrolidi", name: "Macrolidi", rarity: "comune", image: "/cards/antibiotici-macrolidi.png", set: "antibiotici" },
  { id: "nitroimidazoli", name: "Nitroimidazoli", rarity: "leggendaria", image: "/cards/antibiotici-nitroimidazoli.png", set: "antibiotici" },
  { id: "oxazolidinoni", name: "Oxazolidinoni", rarity: "leggendaria", image: "/cards/antibiotici-oxazolidinoni.png", set: "antibiotici" },
  { id: "sulfonamidi", name: "Sulfonamidi", rarity: "epica", image: "/cards/antibiotici-sulfonamidi.png", set: "antibiotici" },
  { id: "tetracicline", name: "Tetracicline", rarity: "epica", image: "/cards/antibiotici-tetracicline.png", set: "antibiotici" },
];


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


const slots = Array.from({ length: 12 }, (_, i) => i);

function CarteTab() {
  // --- storage keys (per espansione/gioco) ---
  const LS_PILLS = "nd_pillole";
  const LS_COLLECTION = "nd_collection_abx";
  const LS_RECENTS = "nd_recent_pulls_abx";

  type PackDef = {
    id: string;
    name: string;
    cost: number; // pillole
    image: string;
    set: CardDef["set"];
  };

  const PACKS: PackDef[] = [
    { id: "pack-antibiotici", name: "Bustina Antibiotici", cost: 30, image: "/packs/pack-antibiotici.png", set: "antibiotici" },
  ];

  const rarityRank: Record<RarityKey, number> = { comune: 0, rara: 1, epica: 2, leggendaria: 3 };

  // valori scambio default
  const EXCHANGE_VALUE: Record<RarityKey, number> = { comune: 1, rara: 3, epica: 7, leggendaria: 15 };

  const [pillole, setPillole] = useState<number>(() => {
    if (typeof window === "undefined") return 120;
    return Number(localStorage.getItem(LS_PILLS)) || 120;
  });

  const [collection, setCollection] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(LS_COLLECTION) || "{}");
    } catch {
      return {};
    }
  });

  const [recentPulls, setRecentPulls] = useState<CardDef[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const ids = JSON.parse(localStorage.getItem(LS_RECENTS) || "[]") as string[];
      return ids.map((id) => CARDS.find((c) => c.id === id)).filter(Boolean) as CardDef[];
    } catch {
      return [];
    }
  });

  const [cardsView, setCardsView] = useState<"negozio" | "collezione" | "scambia">("negozio");
  const [selectedPackId, setSelectedPackId] = useState<string>(PACKS[0]?.id || "pack-antibiotici");

  // pack opening visuals
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState<CardDef[]>([]);
  const [activeRarity, setActiveRarity] = useState<RarityKey | null>(null);
  const [legendFlash, setLegendFlash] = useState(false);

  // exchange
  const [exchangeQty, setExchangeQty] = useState<Record<string, number>>({}); // cardId -> qty to burn

  // modal
  const [modalCardId, setModalCardId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_PILLS, String(pillole));
  }, [pillole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_COLLECTION, JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // salva solo IDs per stare leggeri
    localStorage.setItem(LS_RECENTS, JSON.stringify(recentPulls.map((c) => c.id)));
  }, [recentPulls]);

  const selectedPack = useMemo(() => PACKS.find((p) => p.id === selectedPackId) || PACKS[0], [selectedPackId]);
  const activeColor = activeRarity ? RARITY_COLORS[activeRarity] : "rgba(255,255,255,0.20)";

  // ----------------- RNG (interno: non mostrare percentuali) -----------------
  function rollRarity(): RarityKey {
    const r = Math.random();
    if (r < 0.6) return "comune";
    if (r < 0.85) return "rara";
    if (r < 0.97) return "epica";
    return "leggendaria";
  }

  function pickCardFromSet(setId: CardDef["set"]): CardDef {
    const rarity = rollRarity();
    const pool = CARDS.filter((c) => c.rarity === rarity && c.set === setId);
    const fallback = CARDS.filter((c) => c.set === setId);
    const usePool = pool.length > 0 ? pool : fallback;
    return usePool[Math.floor(Math.random() * usePool.length)];
  }

  function openPack(pack: { cost: number; set: CardDef["set"] }) {
    if (isOpening) return;
    if (!pack) return;
    if (pillole < pack.cost) return;

    setIsOpening(true);
    setPulledCards([]);
    setActiveRarity(null);
    setLegendFlash(false);

    setPillole((p) => p - pack.cost);

    // regola bustina (interno)
    const cardCount = Math.random() < 0.7 ? 1 : 2;

    const pulls: CardDef[] = [];
    for (let i = 0; i < cardCount; i++) pulls.push(pickCardFromSet(pack.set));

    const highest = pulls.reduce((a, b) => (rarityRank[a.rarity] >= rarityRank[b.rarity] ? a : b));
    setActiveRarity(highest.rarity);

    if (highest.rarity === "leggendaria") {
      setLegendFlash(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate?.([40, 30, 40]);
      }
      setTimeout(() => setLegendFlash(false), 700);
    }

    setTimeout(() => {
      setPulledCards(pulls);

      // aggiorna collezione
      setCollection((prev) => {
        const next = { ...prev };
        pulls.forEach((c) => {
          next[c.id] = (next[c.id] || 0) + 1;
        });
        return next;
      });

      // aggiorna recent pulls (max 20)
      setRecentPulls((prev) => {
        const next = [...pulls, ...prev].slice(0, 20);
        return next;
      });

      setIsOpening(false);
    }, 650);
  }

  // ----------------- Collezione: filtri & sort -----------------
  const [filterSet, setFilterSet] = useState<"tutti" | CardDef["set"]>("tutti");
  const [filterRarity, setFilterRarity] = useState<"tutte" | RarityKey>("tutte");
  const [sortMode, setSortMode] = useState<"sbloccate" | "rarita_nome" | "nome">("sbloccate");

  const allSets = useMemo(() => {
    const unique = Array.from(new Set(CARDS.map((c) => c.set)));
    return unique;
  }, []);

  const filteredCards = useMemo(() => {
    let list = [...CARDS];

    if (filterSet !== "tutti") list = list.filter((c) => c.set === filterSet);
    if (filterRarity !== "tutte") list = list.filter((c) => c.rarity === filterRarity);

    const ownedCount = (id: string) => collection[id] || 0;
    const isUnlocked = (id: string) => ownedCount(id) > 0;

    list.sort((a, b) => {
      if (sortMode === "nome") return a.name.localeCompare(b.name, "it");
      if (sortMode === "rarita_nome") {
        const dr = rarityRank[b.rarity] - rarityRank[a.rarity];
        return dr !== 0 ? dr : a.name.localeCompare(b.name, "it");
      }
      // sbloccate prima, poi rarità, poi nome
      const du = Number(isUnlocked(b.id)) - Number(isUnlocked(a.id));
      if (du !== 0) return du;
      const dr = rarityRank[b.rarity] - rarityRank[a.rarity];
      return dr !== 0 ? dr : a.name.localeCompare(b.name, "it");
    });

    return list;
  }, [collection, filterRarity, filterSet, sortMode]);

  const ownedDistinct = useMemo(() => Object.values(collection).filter((n) => n > 0).length, [collection]);

  // ----------------- Scambio doppioni -----------------
  const exchangeCandidates = useMemo(() => {
    return CARDS.map((c) => {
      const count = collection[c.id] || 0;
      const maxBurn = Math.max(0, count - 1);
      return { card: c, count, maxBurn };
    }).filter((x) => x.maxBurn > 0);
  }, [collection]);

  const exchangeTotal = useMemo(() => {
    let total = 0;
    for (const { card } of exchangeCandidates) {
      const qty = exchangeQty[card.id] || 0;
      if (qty > 0) total += qty * EXCHANGE_VALUE[card.rarity];
    }
    return total;
  }, [exchangeCandidates, exchangeQty]);

  function setBurnQty(cardId: string, qty: number, max: number) {
    const safe = Math.max(0, Math.min(max, qty));
    setExchangeQty((prev) => ({ ...prev, [cardId]: safe }));
  }

  function confirmExchange() {
    if (exchangeTotal <= 0) return;

    setCollection((prev) => {
      const next = { ...prev };
      exchangeCandidates.forEach(({ card, maxBurn }) => {
        const qty = exchangeQty[card.id] || 0;
        const safe = Math.max(0, Math.min(maxBurn, qty));
        if (safe <= 0) return;
        next[card.id] = Math.max(1, (next[card.id] || 0) - safe);
      });
      return next;
    });

    setPillole((p) => p + exchangeTotal);
    setExchangeQty({});
  }

  // ----------------- UI helpers -----------------
  function SegmentButton(props: { active: boolean; onClick: () => void; children: any }) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: props.active ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
          color: "white",
          borderRadius: 999,
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 12,
          opacity: props.active ? 1 : 0.85,
        }}
      >
        {props.children}
      </button>
    );
  }

  function CardTile(props: { card: CardDef; locked: boolean; count: number; onClick?: () => void }) {
    const { card, locked, count, onClick } = props;
    const aura = RARITY_COLORS[card.rarity];

    return (
      <button
        type="button"
        onClick={locked ? undefined : onClick}
        disabled={locked}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: 12,
          background: "rgba(255,255,255,0.03)",
          position: "relative",
          overflow: "hidden",
          textAlign: "left",
          cursor: locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.85 : 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -60,
            background: `radial-gradient(circle, ${locked ? "rgba(255,255,255,0.06)" : aura}, rgba(0,0,0,0))`,
            opacity: locked ? 0.25 : 0.18,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${locked ? "rgba(255,255,255,0.18)" : aura}`,
                background: "rgba(0,0,0,0.18)",
                fontWeight: 900,
                whiteSpace: "nowrap",
                opacity: locked ? 0.6 : 1,
              }}
            >
              {locked ? "🔒" : card.rarity.toUpperCase()}
            </div>

            {!locked && count > 1 && (
              <div
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                x{count}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "3 / 4",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.16)",
                overflow: "hidden",
                filter: locked ? "grayscale(1) contrast(0.9) brightness(0.85)" : "none",
                opacity: locked ? 0.55 : 1,
              }}
            >
              <img src={card.image} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ marginTop: 10, fontWeight: 950, letterSpacing: -0.1 }}>
              {locked ? "???" : card.name}
            </div>
            <div style={{ fontSize: 12, opacity: locked ? 0.65 : 0.75, marginTop: 4 }}>
              {locked ? "Da sbloccare" : "Tocca per ingrandire"}
            </div>
          </div>
        </div>
      </button>
    );
  }

  const modalCard = useMemo(() => (modalCardId ? CARDS.find((c) => c.id === modalCardId) : null), [modalCardId]);

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
        {/* Header */}
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
              Bustine, collezione e scambio doppioni in pillole.
            </p>
          </div>
        </div>

        {/* top chips */}
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
            💊 Pillole: <strong style={{ fontWeight: 900 }}>{pillole}</strong>
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
            📦 Carte sbloccate: <strong style={{ fontWeight: 900 }}>{ownedDistinct}</strong> / {CARDS.length}
          </span>
        </div>

        {/* sub-nav */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <SegmentButton active={cardsView === "negozio"} onClick={() => setCardsView("negozio")}>
            🛒 Negozio
          </SegmentButton>
          <SegmentButton active={cardsView === "collezione"} onClick={() => setCardsView("collezione")}>
            📦 Collezione
          </SegmentButton>
          <SegmentButton active={cardsView === "scambia"} onClick={() => setCardsView("scambia")}>
            ♻️ Scambia
          </SegmentButton>
        </div>

        {/* ------------------ NEGOZIO ------------------ */}
        {cardsView === "negozio" && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.16)",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>Negozio bustine</div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Seleziona una bustina e aprila con le pillole.</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Bustina</div>
                  <select
                    value={selectedPackId}
                    onChange={(e) => setSelectedPackId(e.target.value)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      borderRadius: 12,
                      padding: "8px 10px",
                      fontWeight: 850,
                      outline: "none",
                    }}
                  >
                    {PACKS.map((p) => (
                      <option key={p.id} value={p.id} style={{ color: "black" }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* pack card */}
              <div
                className={`packwrap ${legendFlash ? "legendFlash" : ""}`}
                style={{
                  marginTop: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                  borderRadius: 18,
                  padding: 14,
                  overflow: "hidden",
                  boxShadow: isOpening ? `0 0 22px ${activeColor}` : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>{selectedPack?.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                      {pillole < (selectedPack?.cost || 0) ? `Servono ${selectedPack?.cost} pillole.` : "Premi “Apri” per estrarre carte."}
                    </div>
                  </div>

                  <div
                    className={`pack ${isOpening ? "opening" : ""}`}
                    style={{
                      width: 90,
                      height: 120,
                      borderRadius: 16,
                      border: `1px solid ${activeColor}`,
                      background: "rgba(255,255,255,0.02)",
                      boxShadow: isOpening
                        ? `0 0 22px ${activeColor}, 0 20px 60px rgba(0,0,0,0.45)`
                        : `0 0 0 1px rgba(255,255,255,0.06), 0 14px 50px rgba(0,0,0,0.30)`,
                      display: "grid",
                      placeItems: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <img src={selectedPack?.image} alt={selectedPack?.name} style={{ width: "110%", height: "110%", objectFit: "cover" }} />

                    {isOpening && (
                      <div
                        className="glow"
                        style={{
                          position: "absolute",
                          inset: -30,
                          borderRadius: 999,
                          background: `radial-gradient(circle, ${activeColor}, rgba(0,0,0,0))`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => selectedPack && openPack({ cost: selectedPack.cost, set: selectedPack.set })}
                  disabled={isOpening || !selectedPack || pillole < (selectedPack?.cost || 0)}
                  title={pillole < (selectedPack?.cost || 0) ? `Servono ${selectedPack?.cost} pillole` : "Apri bustina"}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(165,110,255,0.18)",
                    color: "white",
                    borderRadius: 16,
                    padding: "12px 14px",
                    cursor: isOpening || pillole < (selectedPack?.cost || 0) ? "not-allowed" : "pointer",
                    opacity: isOpening || pillole < (selectedPack?.cost || 0) ? 0.7 : 1,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>
                    {isOpening
                      ? "📦 Apertura in corso…"
                      : pillole < (selectedPack?.cost || 0)
                      ? "❌ Pillole insufficienti"
                      : `📦 Apri bustina (${selectedPack?.cost}💊)`}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>I doppioni si accumulano e puoi scambiarli in pillole.</div>
                </button>
              </div>
            </div>

            {/* reveal cards */}
            {pulledCards.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>🎴 Carte estratte</h3>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{pulledCards.length} carta/e</div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  {pulledCards.map((c, idx) => (
                    <div
                      key={`${c.id}-${idx}`}
                      className="cardpop show"
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 18,
                        padding: 12,
                        background: "rgba(255,255,255,0.03)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: -60,
                          background: `radial-gradient(circle, ${RARITY_COLORS[c.rarity]}, rgba(0,0,0,0))`,
                          opacity: 0.18,
                          pointerEvents: "none",
                        }}
                      />
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div
                            style={{
                              fontSize: 12,
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: `1px solid ${RARITY_COLORS[c.rarity]}`,
                              background: "rgba(0,0,0,0.18)",
                              fontWeight: 950,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.rarity.toUpperCase()}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>+1</div>
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "3 / 4",
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: "rgba(0,0,0,0.16)",
                              overflow: "hidden",
                            }}
                          >
                            <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>

                          <div style={{ marginTop: 10, fontWeight: 950, letterSpacing: -0.1 }}>{c.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Ora ne hai: {collection[c.id] || 1}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* storico recente */}
                {recentPulls.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>🕘 Ultime estrazioni</h3>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>max 20</div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                      {recentPulls.map((c, idx) => (
                        <div
                          key={`${c.id}-recent-${idx}`}
                          style={{
                            minWidth: 110,
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.03)",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ width: "100%", aspectRatio: "3 / 4", background: "rgba(0,0,0,0.16)" }}>
                            <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ padding: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.2 }}>{c.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{c.rarity}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------ COLLEZIONE ------------------ */}
        {cardsView === "collezione" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 950, letterSpacing: -0.1, marginRight: 6 }}>Filtri</div>

              <select
                value={filterSet}
                onChange={(e) => setFilterSet(e.target.value as any)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  borderRadius: 12,
                  padding: "8px 10px",
                  fontWeight: 850,
                  outline: "none",
                }}
              >
                <option value="tutti" style={{ color: "black" }}>
                  Tutti i set
                </option>
                {allSets.map((s) => (
                  <option key={s} value={s} style={{ color: "black" }}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as any)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  borderRadius: 12,
                  padding: "8px 10px",
                  fontWeight: 850,
                  outline: "none",
                }}
              >
                <option value="tutte" style={{ color: "black" }}>
                  Tutte le rarità
                </option>
                <option value="comune" style={{ color: "black" }}>
                  Comune
                </option>
                <option value="rara" style={{ color: "black" }}>
                  Rara
                </option>
                <option value="epica" style={{ color: "black" }}>
                  Epica
                </option>
                <option value="leggendaria" style={{ color: "black" }}>
                  Leggendaria
                </option>
              </select>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  borderRadius: 12,
                  padding: "8px 10px",
                  fontWeight: 850,
                  outline: "none",
                }}
              >
                <option value="sbloccate" style={{ color: "black" }}>
                  Sbloccate prima
                </option>
                <option value="rarita_nome" style={{ color: "black" }}>
                  Rarità → Nome
                </option>
                <option value="nome" style={{ color: "black" }}>
                  Nome A→Z
                </option>
              </select>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
              Tocca una carta sbloccata per vederla grande.
            </div>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {filteredCards.map((card) => {
                const count = collection[card.id] || 0;
                const locked = count <= 0;
                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    locked={locked}
                    count={count}
                    onClick={() => setModalCardId(card.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------ SCAMBIA ------------------ */}
        {cardsView === "scambia" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>Scambia doppioni</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
              Seleziona quante copie bruciare per ottenere pillole. (Lasci sempre 1 copia in collezione.)
            </div>

            {exchangeCandidates.length === 0 ? (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  padding: 14,
                  background: "rgba(255,255,255,0.03)",
                  opacity: 0.9,
                }}
              >
                Nessun doppione disponibile. Apri altre bustine!
              </div>
            ) : (
              <>
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {exchangeCandidates
                    .sort((a, b) => rarityRank[b.card.rarity] - rarityRank[a.card.rarity])
                    .map(({ card, count, maxBurn }) => {
                      const qty = exchangeQty[card.id] || 0;
                      const value = EXCHANGE_VALUE[card.rarity];
                      return (
                        <div
                          key={card.id}
                          style={{
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 18,
                            padding: 12,
                            background: "rgba(255,255,255,0.03)",
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 56,
                                height: 70,
                                borderRadius: 12,
                                border: "1px solid rgba(255,255,255,0.12)",
                                overflow: "hidden",
                                background: "rgba(0,0,0,0.16)",
                                flex: "0 0 auto",
                              }}
                            >
                              <img src={card.image} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 950, letterSpacing: -0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {card.name}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                                Possedute: <strong>{count}</strong> · Doppioni scambiabili: <strong>{maxBurn}</strong> · Valore:{" "}
                                <strong>{value}💊</strong>/copia
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                            <button
                              type="button"
                              onClick={() => setBurnQty(card.id, qty - 1, maxBurn)}
                              disabled={qty <= 0}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(0,0,0,0.12)",
                                color: "white",
                                cursor: qty <= 0 ? "not-allowed" : "pointer",
                                opacity: qty <= 0 ? 0.5 : 1,
                                fontWeight: 950,
                              }}
                            >
                              −
                            </button>

                            <div
                              style={{
                                minWidth: 40,
                                textAlign: "center",
                                fontWeight: 950,
                                padding: "6px 8px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(255,255,255,0.06)",
                              }}
                            >
                              {qty}
                            </div>

                            <button
                              type="button"
                              onClick={() => setBurnQty(card.id, qty + 1, maxBurn)}
                              disabled={qty >= maxBurn}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(0,0,0,0.12)",
                                color: "white",
                                cursor: qty >= maxBurn ? "not-allowed" : "pointer",
                                opacity: qty >= maxBurn ? 0.5 : 1,
                                fontWeight: 950,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 18,
                    padding: 12,
                    background: "rgba(0,0,0,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>Totale scambio: {exchangeTotal}💊</div>

                  <button
                    type="button"
                    onClick={confirmExchange}
                    disabled={exchangeTotal <= 0}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: exchangeTotal > 0 ? "rgba(91,217,255,0.14)" : "rgba(255,255,255,0.06)",
                      color: "white",
                      borderRadius: 14,
                      padding: "10px 12px",
                      cursor: exchangeTotal <= 0 ? "not-allowed" : "pointer",
                      opacity: exchangeTotal <= 0 ? 0.65 : 1,
                      fontWeight: 950,
                    }}
                  >
                    ♻️ Scambia selezionati
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ------------------ MODAL CARD ------------------ */}
      {modalCard && (collection[modalCard.id] || 0) > 0 && (
        <div
          onClick={() => setModalCardId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(6px)",
            zIndex: 80,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(20,20,20,0.72)",
              boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
              padding: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* aura */}
            <div
              style={{
                position: "absolute",
                inset: -80,
                background: `radial-gradient(circle, ${RARITY_COLORS[modalCard.rarity]}, rgba(0,0,0,0))`,
                opacity: 0.32,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 1000, letterSpacing: -0.2, fontSize: 18 }}>{modalCard.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {modalCard.rarity.toUpperCase()} · Copie: <strong>{collection[modalCard.id] || 1}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCardId(null)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                    borderRadius: 14,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontWeight: 950,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", placeItems: "center" }}>
                <div
                  style={{
                    width: "min(360px, 78vw)",
                    aspectRatio: "3 / 4",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.16)",
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.22)",
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 36px ${RARITY_COLORS[modalCard.rarity]}, 0 30px 120px rgba(0,0,0,0.60)`,
                  }}
                >
                  <img src={modalCard.image} alt={modalCard.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                Tocca fuori dalla finestra per chiudere.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pack.opening {
          animation: nd-pack-shake 0.65s ease-in-out infinite;
        }
        .legendFlash {
          animation: nd-legend-flash 0.7s ease-in-out;
        }
        .cardpop.show {
          animation: nd-card-pop 0.45s ease-out;
        }
        @keyframes nd-pack-shake {
          0% { transform: rotate(-2deg) translateY(0); }
          50% { transform: rotate(2deg) translateY(-2px); }
          100% { transform: rotate(-2deg) translateY(0); }
        }
        @keyframes nd-legend-flash {
          0% { box-shadow: 0 0 0 rgba(255,210,90,0); }
          40% { box-shadow: 0 0 28px rgba(255,210,90,0.8); }
          100% { box-shadow: 0 0 0 rgba(255,210,90,0); }
        }
        @keyframes nd-card-pop {
          0% { transform: translateY(6px) scale(0.98); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
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

  useEffect(() => {
    // Home resta sempre default, ma se arriva un deep-link tipo /#contenuti lo rispettiamo
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "").trim() as TabKey;

    const allowed: TabKey[] = ["home", "contenuti", "carte", "profilo"];
    if (allowed.includes(hash) && hash !== "home") {
      setActiveTab(hash);
    }
  }, []);

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

            {otherItems.map((it) => (
              <ContentCard
                key={safe(it.id)}
                item={it}
                isFavorite={favorites.has(safe(it.id))}
                onToggleFavorite={toggleFavorite}
              />
            ))}

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
          <button
            type="button"
            onClick={() => {
              setActiveTab("contenuti");
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
