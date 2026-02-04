import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { ContentItem, UserProfile } from "@/types/nursediary/types";
import {
  LS_COLLECTION,
  LS_PILLS,
  LS_PROFILE,
  LS_QUIZ_DAILY_DONE,
  LS_QUIZ_WEEKLY_DONE,
  LS_RECENT_PULLS,
} from "@/constants/nursediary/storageKeys";
import { safeJsonParse } from "@/utils/nursediary/json";
import { todayKeyISO, isoWeekKey } from "@/utils/nursediary/dateKeys";
import { parseContentCSV } from "@/utils/nursediary/csv";
import { ContentCard } from "@/components/nursediary/ContentCard";
import { CarteTab } from "@/components/nursediary/CarteTab";
import { IconHome, IconBook, IconCards, IconUser, IconSearch } from "@/svg/nursediary/icons";

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Tutte");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const favoritesCount = favorites.size;

  const [profile, setProfile] = useState<UserProfile | null>(null);
const [isEditingProfile, setIsEditingProfile] = useState(false);
const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [profileDraftName, setProfileDraftName] = useState("");
  const [profileDraftEmail, setProfileDraftEmail] = useState("");
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = safeJsonParse<UserProfile | null>(localStorage.getItem(LS_PROFILE), null);
    setProfile(p);
  }, []);

  const saveProfile = (p: UserProfile | null) => {
    if (typeof window === "undefined") return;
    if (!p) {
      localStorage.removeItem(LS_PROFILE);
      setProfile(null);
      return;
    }
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    setProfile(p);
  };

  const loadStats = () => {
    if (typeof window === "undefined") {
      return { pills: 0, unlocked: 0, totalCopies: 0, duplicates: 0, dailyDone: false, weeklyDone: false, lastPulls: 0 };
    }
    const pills = Number(localStorage.getItem(LS_PILLS) || "0") || 0;
    const collection = safeJsonParse<Record<string, number>>(localStorage.getItem(LS_COLLECTION), {});
    const unlocked = Object.values(collection).filter((n) => n >= 1).length;
    const totalCopies = Object.values(collection).reduce((a, b) => a + (Number(b) || 0), 0);
    const duplicates = Object.values(collection).reduce((a, b) => a + Math.max(0, (Number(b) || 0) - 1), 0);
    const dailyDone = localStorage.getItem(LS_QUIZ_DAILY_DONE) === todayKeyISO();
    const weeklyDone = localStorage.getItem(LS_QUIZ_WEEKLY_DONE) === isoWeekKey();
    const lastPulls = safeJsonParse<any[]>(localStorage.getItem(LS_RECENT_PULLS), []).length;
    return { pills, unlocked, totalCopies, duplicates, dailyDone, weeklyDone, lastPulls };
  };

  type TabKey = "home" | "contenuti" | "carte" | "profilo";
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const [viewportWidth, setViewportWidth] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setViewportWidth(window.innerWidth || 0);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const isCompactNav = viewportWidth > 0 && viewportWidth < 360;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const formatCountdown = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const nextDailyResetMs = (() => {
    const d = new Date(nowMs);
    const next = new Date(d);
    next.setHours(24, 0, 0, 0); // next local midnight
    return next.getTime();
  })();

  const nextWeeklyResetMs = (() => {
    const d = new Date(nowMs);
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    const day = next.getDay(); // 0=Sun ... 1=Mon
    const daysToMon = (8 - day) % 7; // Sun->1, Mon->0, Tue->6 ...
    next.setDate(next.getDate() + (daysToMon === 0 ? 7 : daysToMon));
    return next.getTime();
  })();



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
        const parsed = parseContentCSV(text) as ContentItem[];
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
                  x
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
               Preferiti <span style={{ opacity: 0.85 }}>({favoritesCount})</span>
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
                  <h2 style={{ margin: 0, fontSize: 16 }}> Preferiti</h2>
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
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> <IconSearch size={18} /> Trova subito quello che ti serve</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Apri la ricerca e inizia a digitare (ECG, PEA, accessi venosi...).
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
              <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> <IconBook size={18} /> Crea la tua libreria</div>
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
              <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> Apri i tuoi preferiti</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Vai direttamente alla sezione "Preferiti" gia filtrata.
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
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> <IconCards size={18} /> Scopri la collezione</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Le carte arriveranno a breve: prepara lo spazio per la raccolta.
            </div>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.35 }}>
        Suggerimento: usa  nei contenuti per creare una "lista rapida" delle cose che ti servono piu spesso.
      </div>
    </section>
  );

  const CarteView = <CarteTab />;

  const ProfiloView = (() => {
    const s = loadStats();

    const cardStyle: React.CSSProperties = {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(10,12,18,0.60)",
      borderRadius: 18,
      padding: 14,
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
    };

    const pillPill: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.22)",
      fontWeight: 900,
      fontSize: 14,
    };

    const smallLabel: React.CSSProperties = { fontSize: 12, opacity: 0.75, fontWeight: 800 };

    return (
      <section style={{ paddingTop: 6, paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Profilo</h2>
          <div style={pillPill}>
            <span aria-hidden></span>
            <span>{s.pills}</span>
          </div>
        </div>

        {!profile ? (
          <div style={{ ...cardStyle }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Crea un profilo</div>
            <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35, marginBottom: 12 }}>
              Serve solo per salvare progressi (carte, pillole, quiz). Nessuna complessita: puoi aggiungere l'email piu avanti.
            </div>

            <label style={{ display: "block", ...smallLabel }}>Nome / Nickname</label>
            <input
              value={profileDraftName}
              onChange={(e) => setProfileDraftName(e.target.value)}
              placeholder="Es. NurseMario"
              style={{
                
                marginTop: 6,
                marginBottom: 10,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                fontWeight: 800,
              }}
            />

            <label style={{ display: "block", ...smallLabel }}>Email (opzionale)</label>
            <input
              value={profileDraftEmail}
              onChange={(e) => setProfileDraftEmail(e.target.value)}
              placeholder="email@esempio.it"
              inputMode="email"
              style={{
                
                marginTop: 6,
                marginBottom: 12,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                fontWeight: 700,
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 1000,
                }}
              >
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDataUrl} alt="Avatar" style={{  height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ opacity: 0.9 }}>{(profileDraftName.trim() || "ND").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <label style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ ...smallLabel, marginBottom: 6 }}>Immagine profilo (opzionale)</div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "block",  color: "rgba(255,255,255,0.8)" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setAvatarDataUrl(String(reader.result || ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>


            <button
              type="button"
              onClick={() => {
                const name = profileDraftName.trim();
                if (!name) return;
                saveProfile({
                  id: uid("nd"),
                  displayName: name,
                  email: profileDraftEmail.trim() || undefined,
                  createdAt: Date.now(),
                  avatarDataUrl: avatarDataUrl || undefined,
                });
                setProfileDraftName("");
                setProfileDraftEmail("");
              }}
              style={{
                
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.10)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Crea profilo
            </button>
          </div>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 1000,
                      flex: "0 0 auto",
                    }}
                  >
                    {profile.avatarDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarDataUrl}
                        alt="Avatar"
                        style={{  height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ opacity: 0.9 }}>{profile.displayName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, fontSize: 18, lineHeight: 1.15 }}>{profile.displayName}</div>
                    <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                      {profile.email ? profile.email : "Email non impostata"} - Iscritto:{" "}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    setProfileDraftName(profile.displayName);
                    setProfileDraftEmail(profile.email || "");
                    setAvatarDataUrl(profile.avatarDataUrl || null);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "white",
                    fontWeight: 900,
                    flex: "0 0 auto",
                  }}
                >
                  Modifica
                </button>
              </div>
</div>

            {isEditingProfile && (
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Modifica profilo</div>

                <label style={{ display: "block", ...smallLabel }}>Nome / Nickname</label>
                <input
                  value={profileDraftName}
                  onChange={(e) => setProfileDraftName(e.target.value)}
                  placeholder="Nome"
                  style={{
                    
                    marginTop: 6,
                    marginBottom: 10,
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />

                <label style={{ display: "block", ...smallLabel }}>Email (opzionale)</label>
                <input
                  value={profileDraftEmail}
                  onChange={(e) => setProfileDraftEmail(e.target.value)}
                  placeholder="email@esempio.it"
                  inputMode="email"
                  style={{
                    
                    marginTop: 6,
                    marginBottom: 12,
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                    outline: "none",
                    fontWeight: 700,
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 1000,
                    }}
                  >
                    {avatarDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarDataUrl} alt="Avatar" style={{  height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ opacity: 0.9 }}>{(profileDraftName.trim() || "ND").slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <label style={{ flex: 1, cursor: "pointer" }}>
                    <div style={{ ...smallLabel, marginBottom: 6 }}>Aggiorna immagine</div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "block",  color: "rgba(255,255,255,0.8)" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setAvatarDataUrl(String(reader.result || ""));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const name = profileDraftName.trim();
                      if (!name) return;
                      saveProfile({
                        ...profile,
                        displayName: name,
                        email: profileDraftEmail.trim() || undefined,
                        avatarDataUrl: avatarDataUrl || undefined,
                      });
                      setIsEditingProfile(false);
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(91,217,255,0.18)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Salva
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(0,0,0,0.18)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <div style={cardStyle}>
                <div style={smallLabel}>Carte sbloccate</div>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>{s.unlocked}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Copie totali: {s.totalCopies}</div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Doppioni</div>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>{s.duplicates}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Bruciali in "Scambia"</div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Quiz giornaliero</div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 4 }}>{s.dailyDone ? "OK completato" : "Disponibile"}</div>
                <div style={{ opacity: 0.78, fontSize: 12, marginTop: 6 }}>
                  {s.dailyDone ? "Prossimo quiz tra: " : "Reset tra: "}
                  <span style={{ fontWeight: 900 }}>{formatCountdown(nextDailyResetMs - nowMs)}</span>
                </div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Quiz settimanale</div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 4 }}>{s.weeklyDone ? "OK completato" : "Disponibile"}</div>
                <div style={{ opacity: 0.78, fontSize: 12, marginTop: 6 }}>
                  {s.weeklyDone ? "Prossimo quiz tra: " : "Reset tra: "}
                  <span style={{ fontWeight: 900 }}>{formatCountdown(nextWeeklyResetMs - nowMs)}</span>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Backup dati</div>
              <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35, marginBottom: 10 }}>
                Utile se cambi telefono: esporta e incolla qui per ripristinare. (Solo localStorage, nessun server.)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window === "undefined") return;
                    const payload = {
                      profile: safeJsonParse(localStorage.getItem(LS_PROFILE), null),
                      pills: localStorage.getItem(LS_PILLS),
                      collection: safeJsonParse(localStorage.getItem(LS_COLLECTION), {}),
                      recentPulls: safeJsonParse(localStorage.getItem(LS_RECENT_PULLS), []),
                      favorites: safeJsonParse(localStorage.getItem("nd_favorites"), []),
                      dailyDone: localStorage.getItem(LS_QUIZ_DAILY_DONE),
                      weeklyDone: localStorage.getItem(LS_QUIZ_WEEKLY_DONE),
                    };
                    const str = JSON.stringify(payload);
                    try {
                      await navigator.clipboard.writeText(str);
                      alert("Backup copiato negli appunti OK");
                    } catch {
                      setImportJson(str);
                      alert("Non posso copiare negli appunti: ho messo il backup nel box qui sotto OK");
                    }
                  }}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.10)",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  Esporta
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    const payload = safeJsonParse<any>(importJson, null);
                    if (!payload) {
                      alert("JSON non valido");
                      return;
                    }
                    if (payload.profile) localStorage.setItem(LS_PROFILE, JSON.stringify(payload.profile));
                    if (typeof payload.pills !== "undefined") localStorage.setItem(LS_PILLS, String(payload.pills));
                    if (payload.collection) localStorage.setItem(LS_COLLECTION, JSON.stringify(payload.collection));
                    if (payload.recentPulls) localStorage.setItem(LS_RECENT_PULLS, JSON.stringify(payload.recentPulls));
                    if (payload.favorites) localStorage.setItem("nd_favorites", JSON.stringify(payload.favorites));
                    if (typeof payload.dailyDone !== "undefined") localStorage.setItem(LS_QUIZ_DAILY_DONE, String(payload.dailyDone));
                    if (typeof payload.weeklyDone !== "undefined") localStorage.setItem(LS_QUIZ_WEEKLY_DONE, String(payload.weeklyDone));
                    // ricarica stato
                    const p = safeJsonParse<UserProfile | null>(localStorage.getItem(LS_PROFILE), null);
                    setProfile(p);
                    alert("Backup importato OK");
                  }}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(0,0,0,0.22)",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  Importa
                </button>
              </div>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Incolla qui il backup JSON..."
                rows={5}
                style={{
                  
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "white",
                  outline: "none",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ ...cardStyle }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Premium (bozza)</div>
              <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35 }}>
                In futuro: sincronizzazione cloud, piu espansioni carte, quiz avanzati e raccolte "pocket". Per ora tutto resta free.
              </div>
            </div>
          </>
        )}
      </section>
    );
  })();

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


  const tabs: Array<{ id: TabKey; label: string; icon: React.ReactNode }> = [
    { id: "home", label: "Home", icon: <IconHome size={20} /> },
    { id: "contenuti", label: "Contenuti", icon: <IconBook size={20} /> },
    { id: "carte", label: "Carte", icon: <IconCards size={20} /> },
    { id: "profilo", label: "Profilo", icon: <IconUser size={20} /> },
  ];

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
      {renderActiveTab()}

      {/* overlay per leggibilità */}
<nav
  aria-label="Navigazione principale"
  style={{
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(12px + env(safe-area-inset-bottom))",
    width: "min(560px, calc(100% - 24px))",
    zIndex: 50,
    background: "rgba(18, 20, 26, 0.78)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 8,
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    boxShadow: "0 16px 50px rgba(0,0,0,0.55)",
  }}
>
  {tabs.map((t) => {
    const isActive = activeTab === t.id;

    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setActiveTab(t.id)}
        aria-current={isActive ? "page" : undefined}
        aria-label={t.label}
        title={t.label}
        style={{
          appearance: "none",
          border: "1px solid rgba(255,255,255,0.10)",
          background: isActive ? "rgba(120, 220, 255, 0.18)" : "rgba(0,0,0,0.18)",
          color: "white",
          borderRadius: 18,
          padding: isCompactNav ? "8px 6px" : "10px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontSize: isCompactNav ? 11 : 12,
          lineHeight: 1.1,
          fontWeight: isActive ? 900 : 800,
          width: "100%",
          minWidth: 0,
        }}
      >
        <span style={{ display: "grid", placeItems: "center" }}>{t.icon}</span>
        <span
          style={{
            opacity: isActive ? 1 : 0.92,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {t.label}
        </span>
      </button>
    );
  })}
</nav>

    </main>
  );
}
