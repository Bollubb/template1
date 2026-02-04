import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import styles from "../styles/Home.module.css";

import { ContentCard } from "../components/nursediary/ContentCard";
import { CarteTab } from "../components/nursediary/CarteTab";

import { DOCS_URL, GITHUB_URL } from "../constants";
import type { ContentItem } from "../types/nursediary/types";

// helper
const safe = (v: unknown) => (v == null ? "" : String(v));

export default function Home(): JSX.Element {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Preferiti (minimo indispensabile per soddisfare ContentCard)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const onToggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Placeholder: mantieni la tua logica reale qui
  useEffect(() => {
    setItems([]);
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
        <meta name="description" content="NurseDiary – piattaforma didattica infermieristica" />
      </Head>

      <Section className={styles.hero}>
        <h1 className={styles.title}>NurseDiary</h1>
        <p className={styles.subtitle}>Didattica infermieristica, quiz e carte formative</p>

        <div className={styles.links}>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </Section>

      <Section>
        <h2>Contenuti</h2>

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
      </Section>

      <Section>
        <CarteTab />
      </Section>

      <Section className={styles.footer}>
        <Link href="/">Home</Link>
      </Section>
    </Page>
  );
}
