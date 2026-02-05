import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import styles from "../styles/Home.module.css";

import { ContentCard } from "../components/nursediary/ContentCard";
import { CarteTab } from "../components/nursediary/CarteTab";
import NurseBottomNav, { type NurseTab } from "../components/nursediary/NurseBottomNav";

import type { ContentItem } from "../types/nursediary/types";
import { fetchContentItems } from "../utils/nursediary/contentCsv";

const safe = (v: unknown) => (v == null ? "" : String(v));

const LS = {
  favorites: "nd_favorites",
  pills: "nd_pills",
  packCost: "nd_pack_cost",
};

export default function Home(): JSX.Element {
  const [activeTab, setActiveTab] = useState<NurseTab>("didattica");

  // Didattica data
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Search + only favorites
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Favorites storage
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Cards economy (base)
  const [pills, setPills] = useState<number>(0);
  const [packCost, setPackCost] = useState<number>(30);

  const onToggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Load content CSV
  useEffect(() => {
    (async () => {
      try {
        const parsed = await fetchContentItems();
        setItems(parsed);
      } catch (e) {
        console.error("Errore caricamento contenuti CSV", e);
        setItems([]);
      }
    })();
  }, []);

  // Load favorites + cards economy once
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // favorites
      const rawFav = localStorage.getItem(LS.favorites);
      const favArr = rawFav ? (JSON.parse(rawFav) as string[]) : [];
      setFavoriteIds(new Set(favArr));

      // pills
      const rawPills = localStorage.getItem(LS.pills);
      setPills(rawPills ? Number(rawPills) : 0);

      // pack cost
      const rawCost = localStorage.getItem(LS.packCost);
      setPackCost(rawCost ? Number(rawCost) : 30);
    } catch (e) {
      console.error("Errore lettura storage", e);
    }
  }, []);

  // Persist favorites
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS.favorites, JSON.stringify(Array.from(favoriteIds)));
    } catch (e) {
      console.error("Errore salvataggio preferiti", e);
    }
  }, [favoriteIds]);

  // Persist cards economy
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS.pills, String(pills));
    } catch (e) {
      console.error("Errore salvataggio pills", e);
    }
  }, [pills]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS.packCost, String(packCost));
    } catch (e) {
      console.error("Errore salvataggio packCost", e);
    }
  }, [packCost]);

  const categorie = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const c = safe((i as any).categoria).trim();
      if (c) set.add(c);
    });
    return ["Tutte", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((i) => {
      if (categoria !== "Tutte" && safe((i as any).categoria).trim() !== categoria) return false;
      if (onlyFavorites && !favoriteIds.has(i.id)) return false;

      if (!q) return true;

      const hay = [
        safe((i as any).titolo),
        safe((i as any).descrizione),
        safe((i as any).categoria),
        safe((i as any).tags),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, categoria, query, onlyFavorites, favoriteIds]);

  return (
    <Page title="Home">
      <Head>
        <meta name="description" content="NurseDiary – didattica, quiz e carte formative" />
      </Head>

      {/* HERO / HOME (ripristinata “rifinita”) */}
      <Section className={styles.hero}>
        <h1 className={styles.title}>NurseDiary</h1>
        <p className={styles.subtitle}>
          Una biblioteca rapida di contenuti infermieristici: cerca, salva i preferiti e costruisci la tua raccolta.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
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
            Contenuti: <b>{items.length}</b>
          </div>
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
            Preferiti: <b>{favoriteIds.size}</b>
          </div>
        </div>
      </Section>

      {activeTab === "didattica" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Didattica</h2>

          {/* Controls */}
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca (titolo, descrizione, categoria...)"
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)" }}>
                <input
                  type="checkbox"
                  checked={onlyFavorites}
                  onChange={(e) => setOnlyFavorites(e.target.checked)}
                />
                <span>Solo preferiti</span>
              </label>

              <div style={{ color: "rgba(255,255,255,0.70)" }}>
                Risultati: <b style={{ color: "rgba(255,255,255,0.92)" }}>{filtered.length}</b>
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className={styles.filters}>
            {categorie.map((c) => (
              <button
                key={c}
                className={c === categoria ? styles.active : ""}
                onClick={() => setCategoria(c)}
                type="button"
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Nessun contenuto trovato</div>
              <div style={{ color: "rgba(255,255,255,0.70)" }}>
                Controlla che <code>/public/contenuti.csv</code> esista e sia raggiungibile, oppure modifica filtri/ricerca.
              </div>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  isFavorite={favoriteIds.has(item.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {activeTab === "carte" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Carte</h2>

          {/* Recupero impostazioni base “economia” */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
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
              💊 Pillole: <b>{pills}</b>
            </div>
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
              Bustina: <b>{packCost}</b> pillole
            </div>
          </div>

          <CarteTab pills={pills} setPills={setPills} packCost={packCost} />
        </Section>
      )}

      {activeTab === "opzioni" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Opzioni</h2>
          <p style={{ color: "rgba(255,255,255,0.70)" }}>Work in progress.</p>
        </Section>
      )}

      {activeTab === "profilo" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Profilo</h2>
          <p style={{ color: "rgba(255,255,255,0.70)" }}>Work in progress.</p>
        </Section>
      )}

      <NurseBottomNav active={activeTab} onChange={setActiveTab} />
    </Page>
  );
}
