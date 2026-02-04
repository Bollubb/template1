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

export default function Home(): JSX.Element {
  const [activeTab, setActiveTab] = useState<NurseTab>("didattica");

  // Didattica data
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Search + only favorites
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Favorites storage (nd_favorites)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

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

  // Load favorites once
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem("nd_favorites");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setFavoriteIds(new Set(arr));
    } catch (e) {
      console.error("Errore lettura preferiti", e);
    }
  }, []);

  // Persist favorites
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem("nd_favorites", JSON.stringify(Array.from(favoriteIds)));
    } catch (e) {
      console.error("Errore salvataggio preferiti", e);
    }
  }, [favoriteIds]);

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
      // 1) categoria
      if (categoria !== "Tutte" && safe((i as any).categoria).trim() !== categoria) return false;

      // 2) solo preferiti
      if (onlyFavorites && !favoriteIds.has(i.id)) return false;

      // 3) search
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

      <Section className={styles.hero}>
        <h1 className={styles.title}>NurseDiary</h1>
        <p className={styles.subtitle}>Didattica infermieristica, quiz e carte formative</p>
      </Section>

      {activeTab === "didattica" && (
        <Section>
          <h2>Didattica</h2>

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
                border: "1px solid rgba(0,0,0,0.15)",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={onlyFavorites}
                  onChange={(e) => setOnlyFavorites(e.target.checked)}
                />
                <span>Solo preferiti</span>
              </label>

              <div style={{ color: "rgba(0,0,0,0.6)" }}>
                Risultati: <b>{filtered.length}</b>
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
            <div style={{ padding: 12, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Nessun contenuto trovato</div>
              <div style={{ color: "rgba(0,0,0,0.65)" }}>
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
          <h2>Carte</h2>
          <CarteTab />
        </Section>
      )}

      {activeTab === "opzioni" && (
        <Section>
          <h2>Opzioni</h2>
          <p style={{ color: "rgba(0,0,0,0.7)" }}>Work in progress.</p>
        </Section>
      )}

      {activeTab === "profilo" && (
        <Section>
          <h2>Profilo</h2>
          <p style={{ color: "rgba(0,0,0,0.7)" }}>Work in progress.</p>
        </Section>
      )}

      <NurseBottomNav active={activeTab} onChange={setActiveTab} />
    </Page>
  );
}
