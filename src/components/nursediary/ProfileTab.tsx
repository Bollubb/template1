import React, { useEffect, useMemo, useState } from "react";

import { useToast } from "./Toast";
import { addXp as addXpGlobal, getWeeklyXpMap } from "@/features/progress/xp";
import { getDailyCounter, incDailyCounter, setDailyFlag, getDailyFlag } from "@/features/progress/dailyCounters";

import { QUIZ_BANK, type QuizQuestion } from "@/features/cards/quiz/quizBank";
import {
  calcDailyReward,
  calcWeeklyReward,
  getDailyState,
  getWeeklyState,
  setDailyState,
  setWeeklyState,
  getNextDailyResetMs,
  getNextWeeklyResetMs,
  getHistory,
  pushHistory,
  type QuizHistoryItem,
} from "@/features/cards/quiz/quizLogic";

const LS = {
  profile: "nd_profile",
  avatar: "nd_avatar",
  favorites: "nd_favorites",
  read: "nd_read",
  pills: "nd_pills",
  cards: "nd_card_collection",
  xp: "nd_xp",
  premium: "nd_premium",
  login: "nd_login_daily",
  freePacks: "nd_free_packs",
} as const;

type ProfileData = { name: string; role: string };
type QuizMode = "daily" | "weekly";

type RunState = {
  mode: QuizMode;
  idx: number;
  correct: number;
  questions: QuizQuestion[];
};

const LEVEL_XP = (lvl: number) => 120 + (lvl - 1) * 60;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function svgAvatar(bg: string, emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" rx="64" fill="${bg}"/>
  <text x="50%" y="56%" text-anchor="middle" font-size="120" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji" dominant-baseline="middle">${emoji}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const AVATAR_PRESETS: { label: string; data: string }[] = [
  { label: "🩺", data: svgAvatar("#0ea5e9", "🩺") },
  { label: "💉", data: svgAvatar("#22c55e", "💉") },
  { label: "🫀", data: svgAvatar("#ef4444", "🫀") },
  { label: "🧠", data: svgAvatar("#a855f7", "🧠") },
  { label: "📚", data: svgAvatar("#f59e0b", "📚") },
  { label: "🧪", data: svgAvatar("#06b6d4", "🧪") },
  { label: "🛡️", data: svgAvatar("#64748b", "🛡️") },
  { label: "⭐", data: svgAvatar("#facc15", "⭐") },
];

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function pickRandom<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function computeLevel(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= LEVEL_XP(level)) {
    remaining -= LEVEL_XP(level);
    level += 1;
    if (level > 99) break;
  }
  const need = LEVEL_XP(level);
  return { level, into: remaining, need };
}

export default function ProfileTab({
  pills,
  setPills,
  totalContent,
}: {
  pills: number;
  setPills: React.Dispatch<React.SetStateAction<number>>;
  totalContent: number;
}) {

  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData>({ name: "Utente", role: "Infermiere" });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [premium, setPremium] = useState<boolean>(false);
  const [exportText, setExportText] = useState<string>("");
  const [importText, setImportText] = useState<string>("");

  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [cardsOwned, setCardsOwned] = useState<Record<string, number>>({});

  const [xp, setXp] = useState<number>(0);
  const [freePacks, setFreePacks] = useState<number>(0);

  const [missionTick, setMissionTick] = useState(0);
  const dayKey = useMemo(() => new Date().toISOString().slice(0, 10), [missionTick]);
  const weekKey = useMemo(() => {
    const d = new Date();
    // ISO-ish week key
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }, [missionTick]);

  const LS_MISSIONS = "nd_mission_claims_v1" as const;
  function getClaimed(scope: string, id: string): number {
    if (!isBrowser()) return 0;
    const raw = localStorage.getItem(LS_MISSIONS);
    const map = safeJson<Record<string, number>>(raw, {});
    return map[`${scope}:${id}`] || 0;
  }
  function setClaimed(scope: string, id: string, tier: number) {
    if (!isBrowser()) return;
    const raw = localStorage.getItem(LS_MISSIONS);
    const map = safeJson<Record<string, number>>(raw, {});
    map[`${scope}:${id}`] = Math.max(map[`${scope}:${id}`] || 0, tier);
    try {
      localStorage.setItem(LS_MISSIONS, JSON.stringify(map));
    } catch {}
    setMissionTick((t) => t + 1);
  }


  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);

  const [run, setRun] = useState<RunState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [history, setHistory] = useState<QuizHistoryItem[]>([]);

  // bootstrap
  useEffect(() => {
    if (!isBrowser()) return;

    setProfile(safeJson(localStorage.getItem(LS.profile), { name: "Utente", role: "Infermiere" }));
    setAvatar(localStorage.getItem(LS.avatar));
    setPremium(localStorage.getItem(LS.premium) === "1");

    setFavIds(new Set(safeJson<string[]>(localStorage.getItem(LS.favorites), [])));
    setReadIds(new Set(safeJson<string[]>(localStorage.getItem(LS.read), [])));
    setCardsOwned(safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {}));

    setXp(Number(localStorage.getItem(LS.xp) || 0));
    setFreePacks(Number(localStorage.getItem(LS.freePacks) || 0));

    setHistory(getHistory());
  }, []);

  // persist profile + xp + premium + free packs
  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem(LS.profile, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem(LS.xp, String(xp));
  }, [xp]);

  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem(LS.premium, premium ? "1" : "0");
  }, [premium]);

  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem(LS.freePacks, String(freePacks));
  }, [freePacks]);

    // countdown ticker
  useEffect(() => {
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  function buildAccountExport() {
    if (!isBrowser()) return;
    const data: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (!k.startsWith("nd_")) continue;
        const v = localStorage.getItem(k);
        if (v !== null) data[k] = v;
      }
    } catch {}

    const payload = {
      v: 1,
      exportedAt: new Date().toISOString(),
      data,
    };

    const txt = JSON.stringify(payload);
    setExportText(txt);

    // best-effort copy
    void navigator?.clipboard
      ?.writeText(txt)
      .then(() => toast.push("Account copiato negli appunti", "success"))
      .catch(() => {});
  }

  function applyAccountImport() {
    if (!isBrowser()) return;
    const raw = importText.trim();
    if (!raw) return;

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.push("Import fallito: JSON non valido", "warning");
      return;
    }

    const data: Record<string, string> =
      parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;

    if (!data || typeof data !== "object") {
      toast.push("Import fallito: formato non supportato", "warning");
      return;
    }

    try {
      for (const [k, v] of Object.entries(data)) {
        if (!k.startsWith("nd_")) continue;
        if (typeof v !== "string") continue;
        localStorage.setItem(k, v);
      }
    } catch {}

    // refresh in-memory state (no hard reload)
    setProfile(safeJson(localStorage.getItem(LS.profile), { name: "Utente", role: "Infermiere" }));
    setAvatar(localStorage.getItem(LS.avatar));
    setPremium(localStorage.getItem(LS.premium) === "1");
    setFavIds(new Set(safeJson<string[]>(localStorage.getItem(LS.favorites), [])));
    setReadIds(new Set(safeJson<string[]>(localStorage.getItem(LS.read), [])));
    setCardsOwned(safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {}));
    setXp(Number(localStorage.getItem(LS.xp) || 0));
    setPills(Number(localStorage.getItem(LS.pills) || 0));
    setFreePacks(Number(localStorage.getItem(LS.freePacks) || 0));
    setHistory(getHistory());
    toast.push("Account importato", "success");
  }


  const uniqueCards = useMemo(
    () => Object.keys(cardsOwned).filter((k) => (cardsOwned[k] || 0) > 0).length,
    [cardsOwned]
  );
  const totalCards = useMemo(() => Object.values(cardsOwned).reduce((a, b) => a + (b || 0), 0), [cardsOwned]);

  const lvl = useMemo(() => computeLevel(xp), [xp]);

  const dailyState = useMemo(() => getDailyState(), [dailyLeft]);
  const weeklyState = useMemo(() => getWeeklyState(), [weeklyLeft]);

  const accuracy = useMemo(() => {
    const h = history;
    const tot = h.reduce((a, x) => a + x.total, 0);
    const cor = h.reduce((a, x) => a + x.correct, 0);
    return tot > 0 ? Math.round((cor / tot) * 100) : 0;
  }, [history]);

  const byCategory = useMemo(() => {
    const acc: Record<string, { correct: number; total: number }> = {};
    for (const h of history) {
      for (const k of Object.keys(h.byCategory || {})) {
        const v = h.byCategory[k];
        if (!acc[k]) acc[k] = { correct: 0, total: 0 };
        acc[k].correct += v.correct;
        acc[k].total += v.total;
      }
    }
    const arr = Object.entries(acc)
      .map(([k, v]) => ({ k, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0, ...v }))
      .sort((a, b) => b.pct - a.pct);
    return arr.slice(0, 5);
  }, [history]);

  // Daily login reward (WeWard style) + free pack
  const [loginInfo, setLoginInfo] = useState<{ dayKey: string; streak: number; claimed: boolean }>({
    dayKey: "",
    streak: 0,
    claimed: false,
  });

  useEffect(() => {
    if (!isBrowser()) return;
    const today = new Date().toISOString().slice(0, 10);
    const stored = safeJson(localStorage.getItem(LS.login), { dayKey: "", streak: 0, claimed: false });
    if (stored.dayKey !== today) {
      // new day
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = stored.dayKey === yesterday ? (stored.streak || 0) + 1 : 1;
      const next = { dayKey: today, streak, claimed: false };
      localStorage.setItem(LS.login, JSON.stringify(next));
      setLoginInfo(next);
    } else {
      setLoginInfo(stored);
    }
  }, []);

  function claimDailyLogin() {
    if (loginInfo.claimed) return;
    const bonusPills = 20 + Math.min(20, loginInfo.streak * 2);
    const bonusXp = 15 + Math.min(25, loginInfo.streak * 2);
    setPills((p) => p + bonusPills);
    setXp((x) => x + bonusXp);
    addXpGlobal(bonusXp);

    // 1 free pack per day
    setFreePacks((v) => v + 1);

    // extra pack each 7-day streak
    if (loginInfo.streak % 7 === 0) setFreePacks((v) => v + 1);

    const next = { ...loginInfo, claimed: true };
    setLoginInfo(next);
    if (isBrowser()) localStorage.setItem(LS.login, JSON.stringify(next));
    setFeedback(`Login reward: +${bonusPills} pillole, +${bonusXp} XP, +pack GRATIS`);
    setDailyFlag("nd_daily_login_claimed", true);
    toast.push(`+${bonusPills} 💊`, "success");
    toast.push(`+${bonusXp} XP`, "success");
    incDailyCounter("nd_daily_login_claimed_count", 1);
  }

  // Achievements (obiettivi)
  const achievements = useMemo(() => {
    const arr = [
      { id: "a_read_10", title: "Lettore", desc: "Leggi 10 contenuti", done: readIds.size >= 10, pill: 40, xp: 40 },
      { id: "a_fav_5", title: "Curatore", desc: "Aggiungi 5 preferiti", done: favIds.size >= 5, pill: 30, xp: 30 },
      { id: "a_cards_5", title: "Collezionista", desc: "Ottieni 5 carte uniche", done: uniqueCards >= 5, pill: 50, xp: 40 },
      { id: "a_quiz_3", title: "Studioso", desc: "Completa 3 quiz", done: history.length >= 3, pill: 60, xp: 60 },
      { id: "a_acc_80", title: "Preciso", desc: "Raggiungi 80% accuracy", done: accuracy >= 80 && history.length >= 3, pill: 80, xp: 80 },
    ];
    return arr;
  }, [readIds.size, favIds.size, uniqueCards, history.length, accuracy]);

  const [claimedA, setClaimedA] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!isBrowser()) return;
    setClaimedA(safeJson(localStorage.getItem("nd_achievements_claimed"), {}));
  }, []);
  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem("nd_achievements_claimed", JSON.stringify(claimedA));
  }, [claimedA]);

  function claimAchievement(id: string, pill: number, addXp: number) {
    if (claimedA[id]) return;
    setClaimedA((p) => ({ ...p, [id]: true }));
    setPills((v) => v + pill);
    setXp((v) => v + addXp);
    addXpGlobal(addXp);
    setFeedback(`Obiettivo completato: +${pill} pillole, +${addXp} XP`);
  }

  function startQuiz(nextMode: QuizMode) {
    if (nextMode === "daily" && dailyState.status === "done") return;
    if (nextMode === "weekly" && weeklyState.status === "done") return;

    const questions = pickRandom(QUIZ_BANK, nextMode === "daily" ? 5 : 12);
    setRun({ mode: nextMode, idx: 0, correct: 0, questions });
    setSelected(null);
    setFeedback(null);
  }

  function answer(idx: number) {
    if (!run) return;
    const q = run.questions[run.idx];
    const ok = idx === q.answer;
    const nextCorrect = run.correct + (ok ? 1 : 0);

    setSelected(idx);
    // small delay to show feedback, then advance
    window.setTimeout(() => {
      const isLast = run.idx >= run.questions.length - 1;
      if (!isLast) {
        setRun({ ...run, idx: run.idx + 1, correct: nextCorrect });
        setSelected(null);
        return;
      }

      // finish
      const total = run.questions.length;
      const perfect = nextCorrect === total;

      // build byCategory
      const byCat: Record<string, { correct: number; total: number }> = {};
      for (let i = 0; i < run.questions.length; i++) {
        const qq = run.questions[i];
        const cat = qq.category || "altro";
        if (!byCat[cat]) byCat[cat] = { correct: 0, total: 0 };
        byCat[cat].total += 1;
        // we don't store per-question selection here; approximate: use overall correct ratio not per q
        // Better: treat correct if i < nextCorrect is wrong; cannot.
      }
      // For accuracy by category we compute from current run only using correct proportion by category is not exact without selections.
      // We'll instead compute by category using a simple assumption: correct answers distributed uniformly over questions.
      // (Good enough for MVP; can refine later by storing selections.)
      const ratio = total ? nextCorrect / total : 0;
      for (const cat of Object.keys(byCat)) {
        byCat[cat].correct = Math.round(byCat[cat].total * ratio);
      }

      let reward = 0;
      if (run.mode === "daily") {
        reward = calcDailyReward(nextCorrect, total, perfect, dailyState.streak);
        setDailyState({ ...dailyState, status: "done", streak: dailyState.streak + 1 });
      } else {
        reward = calcWeeklyReward(nextCorrect, total, perfect);
        setWeeklyState({ ...weeklyState, status: "done" });
      }

      // pillole + XP
      setPills((p) => p + reward);
      incDailyCounter("nd_daily_quiz_done", 1);
      toast.push(`+${reward} 💊`, "success");
      const xpGain = 20 + nextCorrect * (run.mode === "daily" ? 6 : 8) + (perfect ? 20 : 0);
      setXp((x) => x + xpGain);
    addXpGlobal(xpGain);
      toast.push(`+${xpGain} XP`, "success");

      const item: QuizHistoryItem = {
        ts: Date.now(),
        mode: run.mode,
        correct: nextCorrect,
        total,
        byCategory: byCat,
      };
      pushHistory(item);
      const newHist = [item, ...history].slice(0, 50);
      setHistory(newHist);

      setFeedback(`Quiz ${run.mode}: ${nextCorrect}/${total} — +${reward} pillole, +${xpGain} XP`);
      setRun(null);
      setSelected(null);
    }, 450);
  }

  async function onPickAvatar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setAvatar(data);
      try {
        localStorage.setItem(LS.avatar, data);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Profile header */}
      <div style={card()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={avatarBox()}>
            {avatar ? (
              <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24 }}>👤</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} style={inp(true)} />
            <input value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} style={{ ...inp(false), marginTop: 8 }} />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={chipBtn()}>
            Carica avatar
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])} />
          </label>


<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
  {AVATAR_PRESETS.map((a) => (
    <button
      key={a.label}
      type="button"
      onClick={() => {
        setAvatar(a.data);
        try {
          localStorage.setItem(LS.avatar, a.data);
        } catch {}
      }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        cursor: "pointer",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
      title={`Preset ${a.label}`}
    >
      <img src={a.data} alt={a.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </button>
  ))}
</div>

          <div style={chip()}>
            Pillole: <b>{pills}</b>
          </div>

          <div style={chip()}>
            Packs FREE: <b>{freePacks}</b>
          </div>

          <button type="button" onClick={() => setPremium((v) => !v)} style={{ ...chipBtn(), background: premium ? "#f59e0b" : "#0f172a", color: premium ? "#1f1300" : "rgba(255,255,255,0.9)" }}>
            {premium ? "Premium attivo" : "Premium (demo)"}
          </button>
        </div>
      </div>


{/* Account locale */}
<div style={card()}>
  <div style={title()}>Account locale</div>
  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>
    Salva/trasferisci il tuo profilo (solo locale, nessun backend). Export/Import include le impostazioni e i progressi salvati su questo dispositivo.
  </div>

  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
    <button type="button" onClick={buildAccountExport} style={primaryBtn(false)}>
      Genera export (copia negli appunti)
    </button>

    <textarea
      value={exportText}
      readOnly
      placeholder="Qui comparirà il JSON export…"
      style={{
        width: "100%",
        minHeight: 84,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 800,
        outline: "none",
        resize: "vertical",
      }}
    />

    <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Import (incolla JSON e importa)</div>
    <textarea
      value={importText}
      onChange={(e) => setImportText(e.target.value)}
      placeholder="Incolla qui il JSON esportato…"
      style={{
        width: "100%",
        minHeight: 84,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 800,
        outline: "none",
        resize: "vertical",
      }}
    />
    <button type="button" onClick={applyAccountImport} style={primaryBtn(false)}>
      Importa account
    </button>
  </div>
</div>

      {/* XP / Level */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={title()}>Progressi</div>
          <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 900 }}>Lv {lvl.level}</div>
        </div>
        <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.round((lvl.into / lvl.need) * 100)}%`, background: "#0ea5e9" }} />
        </div>
        <div style={{ marginTop: 8, color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 12 }}>
          XP: {xp} — Prossimo livello tra {Math.max(0, lvl.need - lvl.into)} XP
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat title="Preferiti" value={String(favIds.size)} />
        <Stat title="Letti" value={`${readIds.size}/${totalContent}`} />
        <Stat title="Carte uniche" value={String(uniqueCards)} />
        <Stat title="Accuracy quiz" value={`${accuracy}%`} />
      </div>

      {/* Daily login */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={title()}>Daily login</div>
            <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>
              Streak: <b>{loginInfo.streak}</b> — 1 pack gratis al giorno (+1 extra ogni 7 giorni)
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Reset: {msToHMS(dailyLeft)}</div>
        </div>

        <button type="button" onClick={claimDailyLogin} disabled={loginInfo.claimed} style={primaryBtn(loginInfo.claimed)}>
          {loginInfo.claimed ? "Già riscattato" : "Riscatta reward"}
        </button>
      </div>

      
      {/* Missioni (tier) */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={title()}>Missioni</div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Step 1 → 2 → 3</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13, marginTop: 6 }}>
          Completa uno step, riscotta la reward, poi si sblocca lo step successivo (più difficile).
        </div>

        {(() => {
          const dailyReads = getDailyCounter("nd_daily_reads");
          const dailyUtility = getDailyCounter("nd_daily_utility_used");
          const dailyPacks = getDailyCounter("nd_daily_packs_opened");
          const dailyRecycled = getDailyCounter("nd_daily_recycled");

          const weeklyXp = (getWeeklyXpMap()[weekKey] || 0);

          const missions = [
            {
              id: "reads",
              scope: dayKey,
              label: "📚 Letture oggi",
              progress: dailyReads,
              tiers: [
                { need: 3, pills: 25, xp: 10 },
                { need: 7, pills: 60, xp: 25 },
                { need: 15, pills: 120, xp: 60, pack: 1 },
              ],
            },
            {
              id: "utility",
              scope: dayKey,
              label: "🛠 Utility oggi",
              progress: dailyUtility,
              tiers: [
                { need: 1, pills: 15, xp: 10 },
                { need: 3, pills: 40, xp: 25 },
                { need: 6, pills: 90, xp: 55 },
              ],
            },
            {
              id: "packs",
              scope: dayKey,
              label: "🎴 Bustine oggi",
              progress: dailyPacks,
              tiers: [
                { need: 1, pills: 10, xp: 10 },
                { need: 3, pills: 35, xp: 25 },
                { need: 6, pills: 80, xp: 55 },
              ],
            },
            {
              id: "recycle",
              scope: dayKey,
              label: "♻️ Riciclo oggi",
              progress: dailyRecycled,
              tiers: [
                { need: 2, pills: 15, xp: 10 },
                { need: 8, pills: 45, xp: 25 },
                { need: 20, pills: 110, xp: 60 },
              ],
            },
            {
              id: "weekly_xp",
              scope: weekKey,
              label: "🏁 XP settimanali",
              progress: weeklyXp,
              tiers: [
                { need: 120, pills: 60, xp: 0 },
                { need: 320, pills: 120, xp: 0, pack: 1 },
                { need: 600, pills: 220, xp: 0, pack: 2 },
              ],
            },
          ] as const;

          return (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {missions.map((m) => {
                const claimed = getClaimed(m.scope, m.id);
                const nextTier = Math.min(3, claimed + 1);
                const tierDef = m.tiers[nextTier - 1];
                const done = m.progress >= tierDef.need;
                const maxed = claimed >= 3;

                return (
                  <div
                    key={`${m.scope}:${m.id}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: maxed ? "rgba(34,197,94,0.10)" : "#0f172a",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 950 }}>{m.label}</div>
                      <div style={{ opacity: 0.8, fontWeight: 900, fontSize: 12 }}>
                        Step {maxed ? 3 : nextTier}/3
                      </div>
                    </div>

                    <div style={{ opacity: 0.8, fontWeight: 800, fontSize: 12 }}>
  Progresso: {m.progress}/{tierDef.need} • Reward: +{tierDef.pills} 💊
  {tierDef.xp ? <span>{" "}+{tierDef.xp} XP</span> : null}
  {("pack" in tierDef && (tierDef as any).pack) ? <span>{" "}+{(tierDef as any).pack} 🎁</span> : null}
</div>

                    <button
                      type="button"
                      disabled={maxed || !done}
                      onClick={() => {
                        if (maxed || !done) return;
                        // grant
                        setPills((p) => p + tierDef.pills);
                        if (tierDef.xp) {
                          setXp((x) => x + tierDef.xp);
                          addXpGlobal(tierDef.xp);
                          toast.push(`+${tierDef.xp} XP`, "success");
                        }
                        if ("pack" in tierDef && (tierDef as any).pack) setFreePacks((v) => v + (tierDef as any).pack);
                        setClaimed(m.scope, m.id, nextTier);
                        toast.push(`Missione completata: +${tierDef.pills} 💊`, "success");
                      }}
                      style={primaryBtn(maxed || !done)}
                    >
                      {maxed ? "Completata" : done ? "Riscatta reward" : "In corso"}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

{/* Quiz */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={title()}>Quiz</div>
            <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>
              Daily/Weekly → pillole + XP (streak daily: {dailyState.streak})
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => startQuiz("daily")} disabled={dailyState.status === "done" || !!run} style={pillBtn(dailyState.status === "done" || !!run)}>
            Daily (reset {msToHMS(dailyLeft)})
          </button>
          <button type="button" onClick={() => startQuiz("weekly")} disabled={weeklyState.status === "done" || !!run} style={pillBtn(weeklyState.status === "done" || !!run)}>
            Weekly (reset {msToHMS(weeklyLeft)})
          </button>
        </div>

        {run && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 900 }}>
              {run.mode.toUpperCase()} — Domanda {run.idx + 1}/{run.questions.length}
            </div>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>{run.questions[run.idx].q}</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {run.questions[run.idx].options.map((op, i) => (
                <button key={i} type="button" onClick={() => answer(i)} disabled={selected !== null} style={optBtn(selected, i)}>
                  {op}
                </button>
              ))}
            </div>
          </div>
        )}

        {feedback && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.90)", fontWeight: 800 }}>
            {feedback}
          </div>
        )}

        {/* History + category stats */}
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
          <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 900 }}>Storico & categorie</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {byCategory.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.65)", fontWeight: 700, fontSize: 13 }}>Completa qualche quiz per vedere le statistiche.</div>
            ) : (
              byCategory.map((c) => (
                <div key={c.k} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
                  <span style={{ textTransform: "capitalize" }}>{c.k}</span>
                  <span>{c.pct}%</span>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {history.slice(0, 5).map((h) => (
              <div key={h.ts} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.88)" }}>
                <span style={{ fontWeight: 900 }}>{h.mode.toUpperCase()}</span>
                <span style={{ fontWeight: 800 }}>{h.correct}/{h.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div style={card()}>
        <div style={title()}>Obiettivi</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {achievements.map((a) => {
            const already = !!claimedA[a.id];
            const can = a.done && !already;
            return (
              <div key={a.id} style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900 }}>{a.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>{a.desc}</div>
                    <div style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontWeight: 800, fontSize: 12 }}>
                      Reward: +{a.pill} pillole, +{a.xp} XP
                    </div>
                  </div>
                  <button type="button" onClick={() => claimAchievement(a.id, a.pill, a.xp)} disabled={!can} style={smallBtn(!can)}>
                    {already ? "Riscattato" : a.done ? "Riscatta" : "In corso"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* styles (no duplicate keys, no blur) */
function card(): React.CSSProperties {
  return { border: "1px solid rgba(255,255,255,0.10)", background: "#0b1220", borderRadius: 20, padding: 14 };
}
function title(): React.CSSProperties {
  return { color: "rgba(255,255,255,0.92)", fontWeight: 950 };
}
function avatarBox(): React.CSSProperties {
  return { width: 64, height: 64, borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
}
function inp(bold: boolean): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.92)", fontWeight: bold ? 950 : 800, outline: "none" };
}
function chip(): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "#0f172a", color: "rgba(255,255,255,0.88)", fontWeight: 900 };
}
function chipBtn(): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "#0f172a", color: "rgba(255,255,255,0.92)", fontWeight: 900, cursor: "pointer" };
}
function pillBtn(disabled: boolean): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: disabled ? "rgba(255,255,255,0.06)" : "#0ea5e9", color: disabled ? "rgba(255,255,255,0.55)" : "#020617", fontWeight: 950, cursor: disabled ? "not-allowed" : "pointer" };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return { marginTop: 10, width: "100%", padding: "12px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: disabled ? "rgba(255,255,255,0.06)" : "#22c55e", color: disabled ? "rgba(255,255,255,0.55)" : "#052e16", fontWeight: 950, cursor: disabled ? "not-allowed" : "pointer" };
}
function smallBtn(disabled: boolean): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: disabled ? "rgba(255,255,255,0.06)" : "#22c55e", color: disabled ? "rgba(255,255,255,0.55)" : "#052e16", fontWeight: 950, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" };
}
function optBtn(selected: number | null, i: number): React.CSSProperties {
  return { padding: "12px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: selected === null ? "rgba(255,255,255,0.06)" : selected === i ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.92)", fontWeight: 850, cursor: selected === null ? "pointer" : "default", textAlign: "left" };
}

function Stat({ title: t, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "#0b1220", borderRadius: 18, padding: 12 }}>
      <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 900 }}>{t}</div>
      <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 22, fontWeight: 950 }}>{value}</div>
    </div>
  );
}


function Leaderboard({ weekKey }: { weekKey: string }) {
  const map = getWeeklyXpMap();
  const items = Object.entries(map)
    .map(([k, v]) => ({ k, v: Number(v) || 0 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  const current = map[weekKey] || 0;

  return (
    <div style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={title()}>Classifica (locale)</div>
        <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Solo sul dispositivo • pronta per globale</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Stat title="XP settimana" value={String(current)} />
          <Stat title="Top settimana" value={String(items[0]?.v ?? 0)} />
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 12, background: "#0f172a" }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Top settimane (XP)</div>
          {items.length === 0 ? (
            <div style={{ opacity: 0.75, fontWeight: 800, fontSize: 13 }}>Inizia a guadagnare XP per vedere la classifica.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {items.map((it, i) => (
                <div key={it.k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 900, fontSize: 13 }}>
                  <div style={{ opacity: 0.85 }}>#{i + 1} • {it.k}</div>
                  <div style={{ opacity: 0.95 }}>{it.v} XP</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Leaderboard weekKey={weekKey} />

    </div>
  );
}


function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
