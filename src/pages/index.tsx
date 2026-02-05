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
  read: "nd_read",
  pills: "nd_pills",
  packCost: "nd_pack_cost",
};

export default function Home(): JSX.Element {
  const [activeTab, setActiveTab] = useState<NurseTab>("home");

  // Didattica data
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Search + only favorites
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [sortMode, setSortMode] = useState<"rilevanza" | "az" | "categoria" | "preferiti">("rilevanza");

  // Favorites storage
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Letto / non letto (Didattica)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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

  const onMarkRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
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

  // Load favorites + read + cards economy once
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // favorites
   const rawFavs = localStorage.getItem(LS.favs);
if (rawFavs) {
  const arr = JSON.parse(rawFavs) as string[];
  setFavIds(new Set(arr));
}

      // read ids
    const rawReadIds = localStorage.getItem(LS.read);
     if (rawReadIds) {
  const arr = JSON.parse(rawReadIds) as string[];
  setReadIds(new Set(arr));
}


      // read
      const rawRead = localStorage.getItem(LS.read);
      if (rawRead) {
        const arr = JSON.parse(rawRead) as string[];
        setReadIds(new Set(arr));
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

  // Persist read state
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS.read, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.error("Errore salvataggio stato letto", e);
    }
  }, [readIds]);

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

    const base = items.filter((it) => {
      const id = safe((it as any).id);
      const title = safe((it as any).titolo || (it as any).title).toLowerCase();
      const desc = safe((it as any).descrizione || (it as any).description).toLowerCase();
      const cat = safe((it as any).categoria || (it as any).category).toLowerCase();
      const tagsRaw = (it as any).tag || (it as any).tags;
      const tags = Array.isArray(tagsRaw) ? tagsRaw.join(" ").toLowerCase() : safe(tagsRaw).toLowerCase();

      if (onlyFavorites && !favoriteIds.has(id)) return false;
      if (onlyUnread && readIds.has(id)) return false;

      if (categoria !== "Tutte") {
        const current = safe((it as any).categoria || (it as any).category);
        if (current !== categoria) return false;
      }

      if (!q) return true;
      return title.includes(q) || desc.includes(q) || cat.includes(q) || tags.includes(q);
    });

    const sorted = [...base];

    // Rilevanza: preferiti e non letti in alto, poi titolo
    if (sortMode === "rilevanza") {
      sorted.sort((a, b) => {
        const ida = safe((a as any).id);
        const idb = safe((b as any).id);
        const fa = favoriteIds.has(ida) ? 1 : 0;
        const fb = favoriteIds.has(idb) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        const ra = readIds.has(ida) ? 1 : 0;
        const rb = readIds.has(idb) ? 1 : 0;
        if (ra !== rb) return ra - rb; // non letti (0) prima
        const ta = safe((a as any).titolo || (a as any).title).toLowerCase();
        const tb = safe((b as any).titolo || (b as any).title).toLowerCase();
        return ta.localeCompare(tb);
      });
      return sorted;
    }

    if (sortMode === "preferiti") {
      sorted.sort((a, b) => {
        const ida = safe((a as any).id);
        const idb = safe((b as any).id);
        const fa = favoriteIds.has(ida) ? 1 : 0;
        const fb = favoriteIds.has(idb) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        const ta = safe((a as any).titolo || (a as any).title).toLowerCase();
        const tb = safe((b as any).titolo || (b as any).title).toLowerCase();
        return ta.localeCompare(tb);
      });
      return sorted;
    }

    if (sortMode === "categoria") {
      sorted.sort((a, b) => {
        const ca = safe((a as any).categoria || (a as any).category).toLowerCase();
        const cb = safe((b as any).categoria || (b as any).category).toLowerCase();
        if (ca !== cb) return ca.localeCompare(cb);
        const ta = safe((a as any).titolo || (a as any).title).toLowerCase();
        const tb = safe((b as any).titolo || (b as any).title).toLowerCase();
        return ta.localeCompare(tb);
      });
      return sorted;
    }

    // A-Z
    sorted.sort((a, b) => {
      const ta = safe((a as any).titolo || (a as any).title).toLowerCase();
      const tb = safe((b as any).titolo || (b as any).title).toLowerCase();
      return ta.localeCompare(tb);
    });
    return sorted;
  }, [items, query, categoria, onlyFavorites, onlyUnread, favoriteIds, readIds, sortMode]);

  return (
    <Page title="Home">
      <Head>
        <meta name="description" content="NurseDiary – didattica, quiz e carte formative" />
      </Head>

      {/* HOME */}
      {activeTab === "home" && (
        <Section>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0b1220",
              borderRadius: 20,
              padding: 14,
            }}
          >
            <h2 style={{ color: "rgba(255,255,255,0.92)", margin: "6px 0 10px" }}>Home</h2>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 12,
                    background: "#0f172a",
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700 }}>Preferiti</div>
                  <div style={{ color: "rgba(255,255,255,0.96)", fontSize: 22, fontWeight: 900 }}>
                    {favoriteIds.size}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 12,
                    background: "#0f172a",
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700 }}>Non letti</div>
                  <div style={{ color: "rgba(255,255,255,0.96)", fontSize: 22, fontWeight: 900 }}>
                    {Math.max(0, items.length - readIds.size)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 16,
                  padding: 12,
                  background: "#0f172a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700 }}>Pillole</div>
                  <div style={{ color: "rgba(255,255,255,0.96)", fontSize: 22, fontWeight: 900 }}>{pills}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("carte")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "#0ea5e9",
                    color: "#020617",
                    fontWeight: 900,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Vai alle carte
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("didattica")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#111827",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Apri Didattica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("didattica");
                    setOnlyFavorites(true);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#111827",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Solo Preferiti
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("didattica");
                    setOnlyUnread(true);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#111827",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Non letti
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}

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
              background: "#0b1220",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
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

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", color: "rgba(255,255,255,0.8)" }}>
                  <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />
                  Solo non letti
                </label>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700 }}>Ordina</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.92)",
                      outline: "none",
                    }}
                  >
                    <option value="rilevanza">Rilevanza</option>
                    <option value="preferiti">Preferiti</option>
                    <option value="categoria">Categoria</option>
                    <option value="az">A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((it) => {
                const id = safe((it as any).id);
                return (
                  <ContentCard
                    key={id}
                    item={it}
                    isFavorite={favoriteIds.has(id)}
                    isRead={readIds.has(id)}
                    onToggleFavorite={(cardId) => onToggleFavorite(cardId)}
                    onMarkRead={(cardId) => onMarkRead(cardId)}
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
