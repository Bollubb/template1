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
      if (rawFav) {
        const arr = JSON.parse(rawFav) as string[];
        setFavoriteIds(new Set(arr));
      }

      // pills
      const rawPills = localStorage.getItem(LS.pills);
      if (rawPills) setPills(Number(rawPills) || 0);

      // pack cost
      const rawCost = localStorage.getItem(LS.packCost);
      if (rawCost) setPackCost(Number(rawCost) || 30);
    } catch (e) {
      console.error("Errore caricamento storage", e);
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
      localStorage.setItem(LS.packCost, String(packCost));
    } catch (e) {
      console.error("Errore salvataggio economia carte", e);
    }
  }, [pills, packCost]);

  // Categories list (from items)
  const categorie = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      const c = safe((it as any).categoria || (it as any).category);
      if (c) set.add(c);
    });
    return ["Tutte", ...Array.from(set)];
  }, [items]);

  // Didattica filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((it) => {
      const id = safe((it as any).id);
      const title = safe((it as any).titolo || (it as any).title).toLowerCase();
      const desc = safe((it as any).descrizione || (it as any).description).toLowerCase();
      const cat = safe((it as any).categoria || (it as any).category).toLowerCase();
      const tagsRaw = (it as any).tag || (it as any).tags;
      const tags = Array.isArray(tagsRaw) ? tagsRaw.join(" ").toLowerCase() : safe(tagsRaw).toLowerCase();

      if (onlyFavorites && !favoriteIds.has(id)) return false;

      if (categoria !== "Tutte") {
        const current = safe((it as any).categoria || (it as any).category);
        if (current !== categoria) return false;
      }

      if (!q) return true;
      return title.includes(q) || desc.includes(q) || cat.includes(q) || tags.includes(q);
    });
  }, [items, query, categoria, onlyFavorites, favoriteIds]);

  return (
    <Page title="Home">
      <Head>
        <meta name="description" content="NurseDiary – didattica, quiz e carte formative" />
      </Head>

      {/* ✅ HERO SOLO IN DIDATTICA */}
      {activeTab === "didattica" && (
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
      )}

      {/* DIDATTICA */}
      {activeTab === "didattica" && (
        <Section>
          {/* ✅ SCUDO: copre lo sfondo “cerchio” dietro la didattica */}
          <div
            style={{
              background: "linear-gradient(to bottom, rgba(2,6,23,0.78), rgba(2,6,23,0.92))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              overflow: "hidden",
            }}
          >
            <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Didattica</h2>

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

              <div className={styles.filters}>
                {categorie.map((c) => (
                  <button key={c} data-active={categoria === c} onClick={() => setCategoria(c)}>
                    {c}
                  </button>
                ))}
              </div>

              <label style={{ display: "flex", gap: 10, alignItems: "center", color: "rgba(255,255,255,0.8)" }}>
                <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />
                Solo preferiti <span style={{ opacity: 0.7 }}>— Risultati: {filtered.length}</span>
              </label>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((it) => {
                const id = safe((it as any).id);
                return (
                  <ContentCard
                    key={id}
                    item={it}
                    isFavorite={favoriteIds.has(id)}
                    onToggleFavorite={(cardId) => onToggleFavorite(cardId)}
                  />
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* CARTE */}
      {activeTab === "carte" && (
        <Section>
          <CarteTab pills={pills} setPills={setPills} packCost={packCost} />
        </Section>
      )}

      {/* OPZIONI */}
      {activeTab === "opzioni" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)" }}>Opzioni</h2>
          <p style={{ color: "rgba(255,255,255,0.70)" }}>Work in progress.</p>
        </Section>
      )}

      {/* PROFILO */}
      {activeTab === "profilo" && (
        <Section>
          <h2 style={{ color: "rgba(255,255,255,0.92)" }}>Profilo</h2>
          <p style={{ color: "rgba(255,255,255,0.70)" }}>Work in progress.</p>
        </Section>
      )}

      {/* ✅ BOTTOM NAV */}
      <NurseBottomNav active={activeTab} onChange={setActiveTab} />
    </Page>
  );
}
