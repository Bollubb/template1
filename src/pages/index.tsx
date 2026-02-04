import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import styles from "../styles/Home.module.css";

import { ContentCard } from "../components/nursediary/ContentCard";
import { CarteTab } from "../components/nursediary/CarteTab";
import NurseBottomNav, { type NurseTab } from "../components/nursediary/NurseBottomNav";

import type { ContentItem } from "../types/nursediary/types";

const safe = (v: unknown) => (v == null ? "" : String(v));

export default function Home(): JSX.Element {
  const [activeTab, setActiveTab] = useState<NurseTab>("didattica");

  // Didattica
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Preferiti minimi per ContentCard
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const onToggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // TODO: qui dobbiamo re-inserire il caricamento reale che avevi nell’index vecchio
  useEffect(() => {
    setItems([]); // <-- placeholder
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
    if (categoria === "Tutte") return items;
    return items.filter((i) => safe(i.categoria).trim() === categoria);
  }, [items, categoria]);

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
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Contenuti vuoti</div>
              <div style={{ color: "rgba(0,0,0,0.65)" }}>
                I contenuti erano nel vecchio <code>index.tsx</code>. Li recuperiamo dalla history GitHub e li
                rimettiamo qui (senza tornare a 3000 righe).
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
          <p style={{ color: "rgba(0,0,0,0.7)" }}>Work in progress (qui metteremo settings, tema, import/export, ecc.).</p>
        </Section>
      )}

      {activeTab === "profilo" && (
        <Section>
          <h2>Profilo</h2>
          <p style={{ color: "rgba(0,0,0,0.7)" }}>Work in progress (login, progressi, preferiti, collezione).</p>
        </Section>
      )}

      <NurseBottomNav active={activeTab} onChange={setActiveTab} />
    </Page>
  );
}
