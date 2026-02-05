import { useEffect, useMemo, useState } from "react";
import Page from "@/layouts/Page";
import styles from "@/styles/Home.module.css";
import ContentCard from "@/components/nursediary/ContentCard";
import CarteTab from "@/components/nursediary/CarteTab";
import { loadContentsFromCsv } from "@/utils/nursediary/contentCsv";

type TabKey = "didattica" | "carte" | "opzioni" | "profilo";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("didattica");

  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyFav, setOnlyFav] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContentsFromCsv("/contenuti.csv").then(setItems);
    const saved = localStorage.getItem("nd_favorites");
    if (saved) setFavoriteIds(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    localStorage.setItem("nd_favorites", JSON.stringify([...favoriteIds]));
  }, [favoriteIds]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (onlyFav && !favoriteIds.has(i.id)) return false;
      if (category !== "all" && i.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.tags?.join(" ").toLowerCase().includes(q)
      );
    });
  }, [items, query, category, onlyFav, favoriteIds]);

  return (
    <Page title="Home">
      {/* HERO — SOLO DIDATTICA */}
      {activeTab === "didattica" && (
        <section className={styles.hero}>
          <h1 className={styles.title}>NurseDiary</h1>
          <p className={styles.subtitle}>
            Una biblioteca rapida di contenuti infermieristici: cerca, salva i
            preferiti e costruisci la tua raccolta.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <div className="pill">Contenuti: <b>{items.length}</b></div>
            <div className="pill">Preferiti: <b>{favoriteIds.size}</b></div>
          </div>
        </section>
      )}

      {/* DIDATTICA */}
      {activeTab === "didattica" && (
        <section className={styles.grid}>
          <input
            placeholder="Cerca (titolo, descrizione, categoria...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search"
          />

          <div className={styles.filters}>
            {categories.map((c) => (
              <button
                key={c}
                data-active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyFav}
              onChange={(e) => setOnlyFav(e.target.checked)}
            />
            Solo preferiti
          </label>

          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              isFavorite={favoriteIds.has(item.id)}
              onToggleFavorite={() => {
                setFavoriteIds((prev) => {
                  const next = new Set(prev);
                  next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                  return next;
                });
              }}
            />
          ))}
        </section>
      )}

      {/* CARTE */}
      {activeTab === "carte" && <CarteTab />}

      {/* OPZIONI */}
      {activeTab === "opzioni" && (
        <section className={styles.grid}>
          <h2>Opzioni</h2>
          <p>Work in progress.</p>
        </section>
      )}

      {/* PROFILO */}
      {activeTab === "profilo" && (
        <section className={styles.grid}>
          <h2>Profilo</h2>
          <p>Work in progress.</p>
        </section>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button onClick={() => setActiveTab("didattica")} data-active={activeTab === "didattica"}>
          Didattica
        </button>
        <button onClick={() => setActiveTab("carte")} data-active={activeTab === "carte"}>
          Carte
        </button>
        <button onClick={() => setActiveTab("opzioni")} data-active={activeTab === "opzioni"}>
          Opzioni
        </button>
        <button onClick={() => setActiveTab("profilo")} data-active={activeTab === "profilo"}>
          Profilo
        </button>
      </nav>
    </Page>
  );
}
