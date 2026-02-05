import React, { useEffect, useMemo, useState } from "react";

import { NURSE_CARDS, RARITY_PILL_VALUES, type NurseCard } from "@/features/cards/cards.data";
import { getDuplicates, openPack, type CardCollection } from "@/features/cards/cards.logic";

const LS_COLLECTION = "nd_card_collection";

type View = "apri" | "collezione" | "scambia";

export function CarteTab({
  pills,
  setPills,
  packCost,
}: {
  pills: number;
  setPills: (next: number) => void;
  packCost: number;
}): JSX.Element {
  const [view, setView] = useState<View>("apri");
  const [collection, setCollection] = useState<CardCollection>({});
  const [opened, setOpened] = useState<NurseCard[]>([]);
  const [opening, setOpening] = useState(false);
  const [modalCard, setModalCard] = useState<NurseCard | null>(null);
  const [selectedDup, setSelectedDup] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Load collection
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(LS_COLLECTION);
      setCollection(raw ? (JSON.parse(raw) as CardCollection) : {});
    } catch (e) {
      console.error("Errore lettura collezione", e);
      setCollection({});
    }
  }, []);

  // Persist collection
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS_COLLECTION, JSON.stringify(collection));
    } catch (e) {
      console.error("Errore salvataggio collezione", e);
    }
  }, [collection]);

  const totalCards = useMemo(() => Object.values(collection).reduce((a, b) => a + b, 0), [collection]);
  const uniqueCards = useMemo(() => Object.keys(collection).length, [collection]);

  const duplicates = useMemo(() => getDuplicates(collection), [collection]);
  const duplicateIds = useMemo(() => Object.keys(duplicates), [duplicates]);

  const selectedGain = useMemo(() => {
    let gain = 0;
    for (const id of Object.keys(selectedDup)) {
      if (!selectedDup[id]) continue;
      const card = NURSE_CARDS.find((c) => c.id === id);
      if (!card) continue;
      // ogni doppione selezionato vale 1 unità (il checkbox rappresenta "questa carta")
      gain += RARITY_PILL_VALUES[card.rarity];
    }
    return gain;
  }, [selectedDup]);

  const openOnePack = () => {
    if (pills < packCost) {
      setToast("Pillole insufficienti per aprire una bustina.");
      return;
    }
    if (opening) return;

    setOpening(true);
    setToast("Apertura bustina...");

    const drawn = openPack(NURSE_CARDS);
    // Piccola animazione prima del reveal
    window.setTimeout(() => {
      setOpened(drawn);
      setPills(pills - packCost);
      setCollection((prev) => {
        const next = { ...prev };
        for (const c of drawn) next[c.id] = (next[c.id] ?? 0) + 1;
        return next;
      });
      setToast(drawn.length === 2 ? "Bustina aperta: 2 carte trovate!" : "Bustina aperta: 1 carta trovata!");
      setOpening(false);
    }, 900);
  };

  const toggleDup = (id: string) => {
    setSelectedDup((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exchangeSelected = () => {
    const ids = Object.keys(selectedDup).filter((id) => selectedDup[id]);
    if (ids.length === 0) return;

    let gain = 0;
    const nextSelected: Record<string, boolean> = {};

    setCollection((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const card = NURSE_CARDS.find((c) => c.id === id);
        if (!card) continue;

        // scambiamo 1 doppione: decrementa la count di 1
        // (mantieni almeno 1 copia: se per bug scendi sotto 1, clamp)
        next[id] = Math.max(1, (next[id] ?? 1) - 1);
        gain += RARITY_PILL_VALUES[card.rarity];
      }
      return next;
    });

    setPills(pills + gain);
    setSelectedDup(nextSelected);
    setToast(`Scambio completato: +${gain} pillole`);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <style>{`
        @keyframes nd-pack-shake {
          0% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-1deg); }
          50% { transform: translateY(0) rotate(1deg); }
          75% { transform: translateY(-2px) rotate(0deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes nd-glow {
          0% { box-shadow: 0 0 0 rgba(14,165,233,0.0); }
          50% { box-shadow: 0 0 26px rgba(14,165,233,0.32); }
          100% { box-shadow: 0 0 0 rgba(14,165,233,0.0); }
        }
      `}</style>

      {/* Header Cards */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 18,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Chip label={`💊 Pillole: ${pills}`} />
          <Chip label={`Bustina: ${packCost} pillole`} />
          <Chip label={`Collezione: ${uniqueCards} / ${NURSE_CARDS.length} (tot: ${totalCards})`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          <NavBtn active={view === "apri"} onClick={() => setView("apri")}>Apri bustine</NavBtn>
          <NavBtn active={view === "collezione"} onClick={() => setView("collezione")}>Collezione</NavBtn>
          <NavBtn active={view === "scambia"} onClick={() => setView("scambia")}>Scambia doppioni</NavBtn>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "10px 12px",
            color: "rgba(255,255,255,0.90)",
          }}
        >
          {toast}
        </div>
      ) : null}

      {view === "apri" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 18,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)" }}>Apri una bustina</div>
                <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>Ogni bustina contiene 1–2 carte.</div>
              </div>
              <img
                src="/packs/pack-antibiotici.png"
                alt="Bustina"
                width={130}
                height={180}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(2,6,23,0.25)",
                  padding: 8,
                  objectFit: "contain",
                  animation: opening ? "nd-pack-shake 0.35s linear infinite, nd-glow 0.9s ease-in-out infinite" : "none",
                }}
              />
            </div>

            <button
              type="button"
              onClick={openOnePack}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: pills >= packCost ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.06)",
                color: pills >= packCost ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
                fontWeight: 800,
                cursor: pills >= packCost ? "pointer" : "not-allowed",
              }}
              disabled={pills < packCost}
            >
              Apri bustina ({packCost} pillole)
            </button>
          </div>

          {opened.length > 0 ? (
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 18,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)", marginBottom: 10 }}>
                Carte ottenute
              </div>
              <div style={{ display: "grid", gridTemplateColumns: opened.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
                {opened.map((c) => (
                  <OpenedCard key={`${c.id}-${Math.random()}`} card={c} onOpen={() => setModalCard(c)} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {view === "collezione" && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)", marginBottom: 10 }}>La tua collezione</div>
          <div style={{ display: "grid", gap: 10 }}>
            {NURSE_CARDS.map((c) => (
              <CollectionRow
                key={c.id}
                card={c}
                count={collection[c.id] ?? 0}
                onOpen={() => {
                  if ((collection[c.id] ?? 0) > 0) setModalCard(c);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {view === "scambia" && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)" }}>♻️ Scambia doppioni</div>
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>Conservi sempre 1 copia. Ogni doppione vale pillole.</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.80)", fontSize: 13 }}>
              Guadagno: <b>+{selectedGain}</b>
            </div>
          </div>

          {duplicateIds.length === 0 ? (
            <div style={{ marginTop: 12, color: "rgba(255,255,255,0.70)" }}>
              Nessun doppione disponibile (apri qualche bustina 😉)
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {duplicateIds.map((id) => {
                const card = NURSE_CARDS.find((c) => c.id === id);
                if (!card) return null;
                return (
                  <DupRow
                    key={id}
                    card={card}
                    available={duplicates[id] ?? 0}
                    checked={!!selectedDup[id]}
                    onToggle={() => toggleDup(id)}
                  />
                );
              })}

              <button
                type="button"
                onClick={exchangeSelected}
                style={{
                  marginTop: 6,
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: selectedGain > 0 ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)",
                  color: selectedGain > 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
                  fontWeight: 800,
                  cursor: selectedGain > 0 ? "pointer" : "not-allowed",
                }}
                disabled={selectedGain === 0}
              >
                Scambia selezionati
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal carta */}
      {modalCard ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalCard(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(2,6,23,0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0b1220",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.95)", fontSize: 18 }}>{modalCard.name}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={rarityBadge(modalCard.rarity)}>{modalCard.rarity}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCard(null)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  padding: "8px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Chiudi
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 18,
                padding: 10,
                background: "rgba(2,6,23,0.35)",
                border: "1px solid rgba(255,255,255,0.10)",
                ...rarityAura(modalCard.rarity),
              }}
            >
              <img
                src={modalCard.image}
                alt={modalCard.name}
                style={{ width: "100%", height: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.85)",
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}

function NavBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "12px 10px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: active ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.06)",
        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.80)",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function rarityColor(rarity: NurseCard["rarity"]) {
  switch (rarity) {
    case "comune":
      return { fg: "rgba(255,255,255,0.82)", bg: "rgba(148,163,184,0.12)", br: "rgba(148,163,184,0.22)" };
    case "rara":
      return { fg: "rgba(125,211,252,0.95)", bg: "rgba(14,165,233,0.14)", br: "rgba(14,165,233,0.30)" };
    case "epica":
      return { fg: "rgba(192,132,252,0.95)", bg: "rgba(168,85,247,0.14)", br: "rgba(168,85,247,0.30)" };
    case "leggendaria":
      return { fg: "rgba(253,230,138,0.98)", bg: "rgba(245,158,11,0.14)", br: "rgba(245,158,11,0.30)" };
    default:
      return { fg: "rgba(255,255,255,0.82)", bg: "rgba(255,255,255,0.06)", br: "rgba(255,255,255,0.12)" };
  }
}

function rarityBadge(rarity: NurseCard["rarity"]) {
  const c = rarityColor(rarity);
  return {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: `1px solid ${c.br}`,
    background: c.bg,
    color: c.fg,
    textTransform: "capitalize" as const,
  } satisfies React.CSSProperties;
}

function rarityTextStyle(rarity: NurseCard["rarity"]) {
  const c = rarityColor(rarity);
  if (rarity === "leggendaria") {
    // "oro" sfumato
    return {
      background: "linear-gradient(90deg, rgba(245,158,11,1), rgba(253,230,138,1), rgba(245,158,11,1))",
      WebkitBackgroundClip: "text",
      color: "transparent",
      fontWeight: 950,
      textTransform: "capitalize" as const,
    } satisfies React.CSSProperties;
  }
  return {
    color: c.fg,
    fontWeight: 950,
    textTransform: "capitalize" as const,
  } satisfies React.CSSProperties;
}

function rarityAura(rarity: NurseCard["rarity"]) {
  const c = rarityColor(rarity);
  return {
    boxShadow: `0 0 0 1px ${c.br}, 0 0 36px ${c.bg}`,
    // ✅ use backgroundImage to avoid duplicate 'background' keys in callers
    backgroundImage: `radial-gradient(120% 120% at 50% 0%, ${c.bg} 0%, rgba(2,6,23,0) 60%)`,
  } satisfies React.CSSProperties;
}

function OpenedCard({ card, onOpen }: { card: NurseCard; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(2,6,23,0.35)",
        borderRadius: 16,
        padding: 10,
        cursor: "pointer",
        ...rarityAura(card.rarity),
      }}
    >
      <img
        src={card.image}
        alt={card.name}
        style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{card.name}</div>
        <span style={rarityBadge(card.rarity)}>{card.rarity}</span>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollectionRow({ card, count, onOpen }: { card: NurseCard; count: number; onOpen: () => void }) {
  const owned = count > 0;
  return (
    <div
      onClick={() => {
        if (owned) onOpen();
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr auto",
        gap: 10,
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(2,6,23,0.35)",
        borderRadius: 16,
        padding: 10,
        cursor: owned ? "pointer" : "default",
      }}
    >
      <div style={{ position: "relative", width: 56, height: 56 }}>
        <img
          src={card.image}
          alt={card.name}
          width={56}
          height={56}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            filter: owned ? "none" : "grayscale(1)",
            opacity: owned ? 1 : 0.35,
          }}
        />
        {!owned ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.82)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(2,6,23,0.55)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <LockIcon />
            </div>
          </div>
        ) : null}
      </div>
      <div>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{card.name}</div>
        <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>
          Rarità: <span style={rarityTextStyle(card.rarity)}>{card.rarity}</span>
          {!owned ? <span style={{ marginLeft: 8, opacity: 0.75 }}>(non ottenuta)</span> : null}
        </div>
      </div>
      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>x{count}</div>
    </div>
  );
}

function DupRow({
  card,
  available,
  checked,
  onToggle,
}: {
  card: NurseCard;
  available: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const gain = RARITY_PILL_VALUES[card.rarity];
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "22px 56px 1fr auto",
        gap: 10,
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(2,6,23,0.35)",
        borderRadius: 16,
        padding: 10,
        cursor: "pointer",
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <img
        src={card.image}
        alt={card.name}
        width={56}
        height={56}
        style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}
      />
      <div>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{card.name}</div>
        <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>
          Disponibili: <b>{available}</b> doppioni
        </div>
      </div>
      <div
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.90)",
          fontWeight: 900,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        +{gain} 💊
      </div>
    </label>
  );
}
