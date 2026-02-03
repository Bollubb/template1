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
  // ---- Persistent state (SSR-safe) ----
  const [pillole, setPillole] = useState<number>(() => {
    if (typeof window === "undefined") return 120;
    return Number(localStorage.getItem("nd_pillole")) || 120;
  });

  const [collection, setCollection] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("nd_collection_abx") || "{}");
    } catch {
      return {};
    }
  });

  const [recentPulls, setRecentPulls] = useState<CardDef[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("nd_recent_pulls") || "[]");
    } catch {
      return [];
    }
  });

  // ---- UI state ----
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState<CardDef[]>([]);
  const [activeRarity, setActiveRarity] = useState<RarityKey | null>(null);
  const [legendFlash, setLegendFlash] = useState(false);

  const [cardsView, setCardsView] = useState<"negozio" | "collezione" | "scambia">("negozio");

  // Collezione: filtri / ordinamento
  const [filterSet, setFilterSet] = useState<"tutti" | "antibiotici">("tutti");
  const [filterRarity, setFilterRarity] = useState<"tutte" | RarityKey>("tutte");
  const [sortMode, setSortMode] = useState<"unlocked" | "rarity" | "name">("unlocked");

  // Negozio: selezione pack
  type PackDef = {
    id: string;
    name: string;
    price: number; // pillole
    image: string;
    set: "antibiotici";
  };

  const PACKS: PackDef[] = useMemo(
    () => [
      { id: "pack-antibiotici", name: "Bustina Antibiotici", price: 30, image: "/packs/pack-antibiotici.png", set: "antibiotici" },
    ],
    []
  );

  const [selectedPackId, setSelectedPackId] = useState<string>(() => PACKS[0]?.id ?? "pack-antibiotici");

  const selectedPack = useMemo(() => PACKS.find((p) => p.id === selectedPackId) || PACKS[0], [PACKS, selectedPackId]);

  // Modal carta
  const [modalCard, setModalCard] = useState<CardDef | null>(null);

  // Scambio: quantità per carta (solo doppioni)
  const [swapQtyById, setSwapQtyById] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_pillole", String(pillole));
  }, [pillole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_collection_abx", JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_recent_pulls", JSON.stringify(recentPulls));
  }, [recentPulls]);

  // ---- Helpers ----
  const rarityRank: Record<RarityKey, number> = useMemo(
    () => ({ comune: 1, rara: 2, epica: 3, leggendaria: 4 }),
    []
  );

  const pillolePerRarity: Record<RarityKey, number> = useMemo(
    () => ({ comune: 1, rara: 3, epica: 7, leggendaria: 15 }),
    []
  );

  const countOf = (id: string) => Number(collection[id] || 0);

  const cardsForPack = useMemo(() => {
    // pronto per future espansioni: filtri per set in base al pack
    const set = selectedPack?.set ?? "antibiotici";
    return CARDS.filter((c) => c.set === set);
  }, [selectedPack]);

  function pickCardFrom(list: CardDef[]): CardDef {
    // Distribuzione semplice: pesi per rarità (non mostrati in UI)
    const weights: Record<RarityKey, number> = {
      comune: 60,
      rara: 25,
      epica: 12,
      leggendaria: 3,
    };

    const pool = list.length ? list : CARDS;
    const total = pool.reduce((acc, c) => acc + (weights[c.rarity] ?? 1), 0);
    let r = Math.random() * total;
    for (const c of pool) {
      r -= weights[c.rarity] ?? 1;
      if (r <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  function openPack() {
    if (!selectedPack) return;
    if (isOpening) return;
    if (pillole < selectedPack.price) return;

    setIsOpening(true);
    setPulledCards([]);
    setActiveRarity(null);
    setLegendFlash(false);

    setPillole((p) => p - selectedPack.price);

    // 70% 1 carta, 30% 2 carte (non mostrato in UI)
    const cardCount = Math.random() < 0.7 ? 1 : 2;

    const pulls: CardDef[] = [];
    for (let i = 0; i < cardCount; i++) pulls.push(pickCardFrom(cardsForPack));

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

      setCollection((prev) => {
        const next = { ...prev };
        pulls.forEach((c) => {
          next[c.id] = (next[c.id] || 0) + 1;
        });
        return next;
      });

      setRecentPulls((prev) => {
        const merged = [...pulls, ...prev].slice(0, 20);
        return merged;
      });

      setIsOpening(false);
    }, 650);
  }

  // ---- Collezione: lista filtrata + ordinata ----
  const filteredCards = useMemo(() => {
    let list = [...CARDS];

    if (filterSet !== "tutti") list = list.filter((c) => c.set === filterSet);
    if (filterRarity !== "tutte") list = list.filter((c) => c.rarity === filterRarity);

    const isUnlocked = (c: CardDef) => countOf(c.id) > 0;

    const byName = (a: CardDef, b: CardDef) => a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    const byRarityThenName = (a: CardDef, b: CardDef) =>
      rarityRank[b.rarity] - rarityRank[a.rarity] || byName(a, b);
    const byUnlockedFirst = (a: CardDef, b: CardDef) => {
      const au = isUnlocked(a) ? 1 : 0;
      const bu = isUnlocked(b) ? 1 : 0;
      return bu - au || byRarityThenName(a, b);
    };

    if (sortMode === "name") list.sort(byName);
    else if (sortMode === "rarity") list.sort(byRarityThenName);
    else list.sort(byUnlockedFirst);

    return list;
  }, [collection, filterSet, filterRarity, sortMode, rarityRank]);

  // ---- Scambio: candidati + totale pillole ----
  const swapRows = useMemo(() => {
    return CARDS.map((card) => {
      const count = countOf(card.id);
      const dupes = Math.max(0, count - 1);
      return { card, count, dupes };
    })
      .filter((x) => x.dupes > 0)
      .sort((a, b) => rarityRank[b.card.rarity] - rarityRank[a.card.rarity]);
  }, [collection, rarityRank]);

  const swapTotalPills = useMemo(() => {
    return swapRows.reduce((acc, row) => {
      const qty = Math.min(row.dupes, Math.max(0, swapQtyById[row.card.id] || 0));
      return acc + qty * (pillolePerRarity[row.card.rarity] || 0);
    }, 0);
  }, [swapRows, swapQtyById, pillolePerRarity]);

  function incSwap(id: string, max: number) {
    setSwapQtyById((prev) => {
      const cur = prev[id] || 0;
      const next = Math.min(max, cur + 1);
      return { ...prev, [id]: next };
    });
  }

  function decSwap(id: string) {
    setSwapQtyById((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur - 1);
      return { ...prev, [id]: next };
    });
  }

  function confirmSwap() {
    if (swapTotalPills <= 0) return;

    // aggiorna collezione (brucia solo doppioni, lasciando almeno 1)
    setCollection((prev) => {
      const next = { ...prev };
      swapRows.forEach(({ card, dupes }) => {
        const qty = Math.min(dupes, Math.max(0, swapQtyById[card.id] || 0));
        if (qty > 0) next[card.id] = Math.max(1, (next[card.id] || 0) - qty);
      });
      return next;
    });

    setPillole((p) => p + swapTotalPills);
    setSwapQtyById({});
  }

  // ---- UI components ----
  const TabButton = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.18)",
        color: "white",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );

  const CardTile = ({ card }: { card: CardDef }) => {
    const owned = countOf(card.id);
    const locked = owned <= 0;
    return (
      <div
        onClick={() => {
          if (!locked) setModalCard(card);
        }}
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.22)",
          cursor: locked ? "default" : "pointer",
          minHeight: 128,
        }}
      >
        <img
          src={card.image}
          alt={card.name}
          style={{
            width: "100%",
            height: 160,
            objectFit: "cover",
            filter: locked ? "grayscale(1) blur(0.4px)" : "none",
            opacity: locked ? 0.32 : 1,
          }}
        />
        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              background: locked ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.40)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "white",
              fontWeight: 800,
            }}
          >
            {locked ? "🔒" : card.rarity.toUpperCase()}
          </span>
          {!locked && owned > 1 && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.40)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "white",
                fontWeight: 900,
              }}
            >
              x{owned}
            </span>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 10px",
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.70) 65%, rgba(0,0,0,0.80) 100%)",
            color: "white",
            fontWeight: 800,
          }}
        >
          {locked ? "???" : card.name}
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{locked ? "Da sbloccare" : "Collezione"}</div>
        </div>
      </div>
    );
  };

  const Modal = ({ card }: { card: CardDef }) => {
    const aura = RARITY_COLORS[card.rarity];
    return (
      <div
        onClick={() => setModalCard(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: 18,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(420px, 92vw)",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,10,10,0.88)",
            padding: 14,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 34px 6px ${aura}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: 16 }}>{card.name}</div>
            <button
              onClick={() => setModalCard(null)}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 800,
              }}
            >
              Chiudi
            </button>
          </div>

          <div style={{ height: 10 }} />

          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <img src={card.image} alt={card.name} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          <div style={{ height: 12 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
              }}
            >
              {card.rarity.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Copie: x{countOf(card.id)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ---- Render ----
  return (
    <div style={{ padding: "14px 12px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ color: "white", fontWeight: 1000, fontSize: 18 }}>Carte</div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.22)",
            color: "white",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
          title="Pillole"
        >
          💊 {pillole}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div style={{ display: "flex", gap: 10 }}>
        <TabButton label="Negozio" active={cardsView === "negozio"} onClick={() => setCardsView("negozio")} />
        <TabButton label="Collezione" active={cardsView === "collezione"} onClick={() => setCardsView("collezione")} />
        <TabButton label="Scambia" active={cardsView === "scambia"} onClick={() => setCardsView("scambia")} />
      </div>

      <div style={{ height: 14 }} />

      {cardsView === "negozio" && (
        <div>
          <div style={{ color: "white", fontWeight: 900, opacity: 0.9 }}>Scegli una bustina</div>
          <div style={{ height: 10 }} />

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <img
              src={selectedPack?.image}
              alt={selectedPack?.name || "Pack"}
              style={{ width: 92, height: 92, objectFit: "contain" }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ color: "white", fontWeight: 1000, fontSize: 16 }}>{selectedPack?.name}</div>
              <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, marginTop: 4 }}>
                Costo: {selectedPack?.price} 💊
              </div>
              <div style={{ height: 10 }} />

              <select
                value={selectedPackId}
                onChange={(e) => setSelectedPackId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.24)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                {PACKS.map((p) => (
                  <option key={p.id} value={p.id} style={{ color: "black" }}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div style={{ height: 10 }} />

              <button
                onClick={openPack}
                disabled={isOpening || pillole < (selectedPack?.price || 0)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background:
                    isOpening || pillole < (selectedPack?.price || 0)
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  cursor: isOpening || pillole < (selectedPack?.price || 0) ? "not-allowed" : "pointer",
                }}
              >
                {isOpening ? "Apertura..." : "Apri bustina"}
              </button>
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Effetto flash leggendaria */}
          {legendFlash && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,210,90,0.10)",
                pointerEvents: "none",
                zIndex: 40,
              }}
            />
          )}

          {/* Carte estratte (solo sessione corrente) */}
          {pulledCards.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.20)",
              }}
            >
              <div style={{ color: "white", fontWeight: 1000 }}>
                Carte estratte{" "}
                {activeRarity && (
                  <span style={{ opacity: 0.85, fontWeight: 800 }}>• {activeRarity.toUpperCase()}</span>
                )}
              </div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {pulledCards.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <img src={c.image} alt={c.name} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                    <div style={{ padding: 10, background: "rgba(0,0,0,0.35)", color: "white", fontWeight: 900 }}>
                      {c.name}
                      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>{c.rarity.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 14 }} />

          {/* Ultime estrazioni (persistenti, max 20) */}
          {recentPulls.length > 0 && (
            <div style={{ padding: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)" }}>
              <div style={{ color: "white", fontWeight: 1000 }}>Ultime estrazioni</div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {recentPulls.map((c, idx) => (
                  <div
                    key={`${c.id}-recent-${idx}`}
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.22)",
                    }}
                  >
                    <img src={c.image} alt={c.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {cardsView === "collezione" && (
        <div>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>SET</div>
                <select
                  value={filterSet}
                  onChange={(e) => setFilterSet(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.24)",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  <option value="tutti" style={{ color: "black" }}>
                    Tutti
                  </option>
                  <option value="antibiotici" style={{ color: "black" }}>
                    Antibiotici
                  </option>
                </select>
              </div>

              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>RARITÀ</div>
                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.24)",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  <option value="tutte" style={{ color: "black" }}>
                    Tutte
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
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>ORDINAMENTO</div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.24)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                <option value="unlocked" style={{ color: "black" }}>
                  Sbloccate prima
                </option>
                <option value="rarity" style={{ color: "black" }}>
                  Rarità → Nome
                </option>
                <option value="name" style={{ color: "black" }}>
                  Nome A → Z
                </option>
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filteredCards.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {cardsView === "scambia" && (
        <div>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <div style={{ color: "white", fontWeight: 1000 }}>Scambia doppioni</div>
            <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, marginTop: 6, fontSize: 13 }}>
              Seleziona quante copie vuoi scambiare. Le prime copie rimangono in collezione.
            </div>

            <div style={{ height: 12 }} />

            {swapRows.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>Nessun doppione disponibile.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {swapRows.map(({ card, dupes }) => {
                  const qty = Math.min(dupes, Math.max(0, swapQtyById[card.id] || 0));
                  const valueEach = pillolePerRarity[card.rarity] || 0;
                  return (
                    <div
                      key={card.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      <img src={card.image} alt={card.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, color: "white", fontWeight: 800 }}>
                          Doppioni: {dupes} • {valueEach}💊 ciascuno
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => decSwap(card.id)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontWeight: 1000,
                          }}
                        >
                          −
                        </button>
                        <div style={{ minWidth: 28, textAlign: "center", color: "white", fontWeight: 1000 }}>{qty}</div>
                        <button
                          onClick={() => incSwap(card.id, dupes)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontWeight: 1000,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ height: 12 }} />

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                paddingTop: 10,
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ color: "white", fontWeight: 1000 }}>Totale: {swapTotalPills} 💊</div>
              <button
                onClick={confirmSwap}
                disabled={swapTotalPills <= 0}
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: swapTotalPills <= 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  cursor: swapTotalPills <= 0 ? "not-allowed" : "pointer",
                }}
              >
                Scambia selezionati
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCard && <Modal card={modalCard} />}
    </div>
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
