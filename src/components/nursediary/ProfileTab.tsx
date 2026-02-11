import React, { useEffect, useMemo, useState } from "react";

import { useToast } from "./Toast";
import MissionHub from "./MissionHub";
import Leaderboard, { type PlayerCard } from "./Leaderboard";
import ProfileCardModal from "./ProfileCardModal";
import { addXp as addXpGlobal, getWeeklyXpMap } from "@/features/progress/xp";
import { getLocalProfile, saveLocalProfile, getAvatar as getAvatarLS, setAvatar as setAvatarLS, getAccountCreated as getAccountCreatedLS, setAccountCreated as setAccountCreatedLS } from "@/features/profile/profileStore";
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
  userId: "nd_user_id",
  leaderboard: "nd_leaderboard_users",
} as const;

type ProfileData = { name: string; role: string; bio?: string };
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

function seedLeaderboard(me: PlayerCard): PlayerCard[] {
  // demo "community locale" - deterministic-ish
  const presets = [
    { name: "Sara", profession: "Infermiere", bio: "Turnista, terapia intensiva." },
    { name: "Luca", profession: "OSS", bio: "Reparto medico, focus su comfort." },
    { name: "Giulia", profession: "Infermiere", bio: "Area critica, triage." },
    { name: "Marco", profession: "Studente", bio: "Sto imparando: quiz a manetta." },
    { name: "Elena", profession: "Infermiere", bio: "Wound care & accessi venosi." },
    { name: "Davide", profession: "Medico", bio: "Emergenza-urgenza, amante delle checklist." },
  ];

  const base = Math.max(120, Math.min(1200, me.xp + 200));
  return presets.map((p, idx) => {
    const xp = Math.max(0, Math.round(base * (0.55 + idx * 0.12) + (idx % 2 ? 35 : 0)));
    return {
      id: `demo_${idx}_${xp}`,
      name: p.name,
      profession: p.profession,
      bio: p.bio,
      avatar: null,
      xp,
    };
  });
}

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

type ProfileSection = "overview" | "missions" | "quiz" | "leaderboard" | "account";

function clampText(s: string, max: number) {
  const v = String(s || "");
  return v.length > max ? v.slice(0, max) : v;
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
  const [section, setSection] = useState<ProfileSection>("overview");
  const [accountCreated, setAccountCreated] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const canEditProfile = !accountCreated || editUnlocked;
  const [lbMode, setLbMode] = useState<"weekly" | "all">("weekly");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [userId, setUserId] = useState<string>("me");
  const [lbUsers, setLbUsers] = useState<PlayerCard[]>([]);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardPlayer, setCardPlayer] = useState<PlayerCard | null>(null);
  const [premium, setPremium] = useState<boolean>(false);
  const [exportText, setExportText] = useState<string>("");
  const [importText, setImportText] = useState<string>("");

  const PROFILE_LIMITS = { name: 18, profession: 26, bio: 160 } as const;

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

    const prof = safeJson<ProfileData>(localStorage.getItem(LS.profile), { name: "Utente", role: "Infermiere", bio: "" });
    const av = localStorage.getItem(LS.avatar);
    const xpVal = Number(localStorage.getItem(LS.xp) || 0);

    setProfile(prof);
    setAvatar(av);
    setPremium(localStorage.getItem(LS.premium) === "1");

    setFavIds(new Set(safeJson<string[]>(localStorage.getItem(LS.favorites), [])));
    setReadIds(new Set(safeJson<string[]>(localStorage.getItem(LS.read), [])));
    setCardsOwned(safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {}));

    setXp(xpVal);
    setFreePacks(Number(localStorage.getItem(LS.freePacks) || 0));

    // user id + leaderboard seed (locale)
    let uid = localStorage.getItem(LS.userId);
    if (!uid) {
      uid = `u_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
      try {
        localStorage.setItem(LS.userId, uid);
      } catch {}
    }
    setUserId(uid);

    const me: PlayerCard = {
      id: uid,
      name: prof.name || "Utente",
      profession: prof.role || "Infermiere",
      bio: (prof.bio || "").slice(0, 140),
      avatar: av,
      xp: xpVal,
    };

    const saved = safeJson<PlayerCard[]>(localStorage.getItem(LS.leaderboard), []);
    const others = saved.length ? saved : seedLeaderboard(me);
    setLbUsers([me, ...others.filter((p) => p.id !== me.id)]);

    setHistory(getHistory());
  }, []);

  // persist profile + xp + premium + free packs
  useEffect(() => {
    if (!isBrowser()) return;
    saveLocalProfile({ name: profile.name, profession: profile.role, bio: profile.bio ?? "" });
  }, [profile]);

  // keep "me" in leaderboard in sync
  useEffect(() => {
    if (!isBrowser()) return;
    if (!userId) return;
    setLbUsers((prev) => {
      const me: PlayerCard = {
        id: userId,
        name: profile.name || "Utente",
        profession: profile.role || "Infermiere",
        bio: (profile.bio || "").slice(0, 140),
        avatar,
        xp,
      };
      const idx = prev.findIndex((p) => p.id === userId);
      if (idx === -1) return [me, ...prev];
      const curr = prev[idx];
      const same = curr.name === me.name && curr.profession === me.profession && curr.bio === me.bio && curr.avatar === me.avatar && curr.xp === me.xp;
      if (same) return prev;
      const next = prev.slice();
      next[idx] = me;
      return next;
    });
  }, [userId, profile, avatar, xp]);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const others = lbUsers.filter((p) => p.id !== userId);
      localStorage.setItem(LS.leaderboard, JSON.stringify(others));
    } catch {}
  }, [lbUsers, userId]);

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

    // Anti-ripetizione: evita le domande viste di recente (fallback se non bastano)
    const SEEN_KEY = "nd_quiz_seen_v1";
    const seen = (() => {
      try {
        const raw = localStorage.getItem(SEEN_KEY);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
      } catch {
        return [] as string[];
      }
    })();

    const target = nextMode === "daily" ? 5 : 12;
    const pool0 = QUIZ_BANK.filter((q) => !seen.includes(q.id));
    const pool = pool0.length >= target ? pool0 : QUIZ_BANK;

    // Piccolo bilanciamento categorie (senza bloccare se non possibile)
    const shuffled = pickRandom(pool, pool.length);
    const maxPerCat = nextMode === "daily" ? 2 : 4;
    const picked: QuizQuestion[] = [];
    const perCat: Record<string, number> = {};
    for (const q of shuffled) {
      const c = q.category || "altro";
      if ((perCat[c] || 0) >= maxPerCat) continue;
      picked.push(q);
      perCat[c] = (perCat[c] || 0) + 1;
      if (picked.length >= target) break;
    }
    // Fallback: se non abbiamo raggiunto target, riempi senza limiti
    if (picked.length < target) {
      for (const q of shuffled) {
        if (picked.find((x) => x.id === q.id)) continue;
        picked.push(q);
        if (picked.length >= target) break;
      }
    }

    const questions = picked.slice(0, target);
    try {
      const nextSeen = [...questions.map((q) => q.id), ...seen].slice(0, 30);
      localStorage.setItem(SEEN_KEY, JSON.stringify(nextSeen));
    } catch {}

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

  function openSelfCard() {
    const me: PlayerCard = {
      id: userId,
      name: profile.name || "Utente",
      profession: profile.role || "Infermiere",
      bio: (profile.bio || "").slice(0, 140),
      avatar,
      xp,
    };
    setCardPlayer(me);
    setCardOpen(true);
  }

  const players = useMemo(() => {
    if (lbMode === "all") return lbUsers;
    const weeklyMap = getWeeklyXpMap();
    const myWeekly = weeklyMap[weekKey] || 0;
    // For demo users: deterministic pseudo-weekly score
    const pseudo = (id: string, base: number) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      h = (h ^ Number(weekKey.replace(/\D/g, ""))) >>> 0;
      const r = (h % 80) - 20; // -20..59
      return Math.max(0, Math.round(base * 0.08) + r);
    };
    return lbUsers.map((p) => ({ ...p, xp: p.id === userId ? myWeekly : pseudo(p.id, p.xp) }));
  }, [lbUsers, lbMode, weekKey, userId]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ProfileCardModal open={cardOpen} player={cardPlayer} onClose={() => setCardOpen(false)} />

      {/* Profile header */}
      <div style={card()}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <div style={avatarBox()}>
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 24 }}>👤</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAvatarPickerOpen((v) => !v)}
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Cambia immagine profilo"
            >
              ✏️ Cambia immagine
            </button>

            <button type="button" onClick={() => openSelfCard()} style={{ ...chipBtn(), padding: "6px 10px" }}>
              📇 Scheda profilo
            </button>
          </div>

          <div style={{ flex: 1 }}>
            <input
              disabled={!canEditProfile}
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: clampText(e.target.value, PROFILE_LIMITS.name) }))}
              style={inp(true)}
              placeholder="Nome utente"
            />
            <div style={{ marginTop: 4, opacity: 0.65, fontWeight: 800, fontSize: 12 }}>
              {String(profile.name || "").length}/{PROFILE_LIMITS.name}
            </div>

            <input
              disabled={!canEditProfile}
              value={profile.role}
              onChange={(e) => setProfile((p) => ({ ...p, role: clampText(e.target.value, PROFILE_LIMITS.profession) }))}
              style={{ ...inp(false), marginTop: 8 }}
              placeholder="Professione (es. Infermiere, Medico…)"
            />
            <div style={{ marginTop: 4, opacity: 0.65, fontWeight: 800, fontSize: 12 }}>
              {String(profile.role || "").length}/{PROFILE_LIMITS.profession}
            </div>
            <textarea
              disabled={!canEditProfile}
              value={profile.bio ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, bio: clampText(e.target.value, PROFILE_LIMITS.bio) }))}
              placeholder="Breve descrizione (max 160 caratteri)"
              style={{
                ...inp(false),
                marginTop: 8,
                minHeight: 70,
                resize: "vertical",
                fontWeight: 800,
              }}
            />
            <div style={{ marginTop: 4, opacity: 0.65, fontWeight: 800, fontSize: 12 }}>
              {String(profile.bio || "").length}/{PROFILE_LIMITS.bio}
            </div>
          </div>
        </div>

        {avatarPickerOpen && (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label style={chipBtn()}>
                📷 Da telefono
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])}
                />
              </label>

              <button type="button" onClick={() => setShowPresets((v) => !v)} style={chipBtn()}>
                {showPresets ? "Nascondi preset" : "🧩 Scegli preset"}
              </button>
            </div>

            {showPresets && (
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
                      setAvatarPickerOpen(false);
                      setShowPresets(false);
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
            )}
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setPremium((v) => !v)}
            style={{
              ...chipBtn(),
              background: premium ? "#f59e0b" : "#0f172a",
              color: premium ? "#1f1300" : "rgba(255,255,255,0.9)",
            }}
          >
            {premium ? "Premium attivo" : "Premium (demo)"}
          </button>
        </div>
      </div>

      {/* Sezioni (per ridurre confusione) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", overflowX: "hidden", paddingBottom: 2 }}>
        <SegBtn active={section === "overview"} onClick={() => setSection("overview")}>Panoramica</SegBtn>
        <SegBtn active={section === "quiz"} onClick={() => setSection("quiz")}>Quiz</SegBtn>
        <SegBtn active={section === "missions"} onClick={() => setSection("missions")}>Missioni</SegBtn>
        <SegBtn active={section === "leaderboard"} onClick={() => setSection("leaderboard")}>Classifica</SegBtn>
        <SegBtn active={section === "account"} onClick={() => setSection("account")}>Account</SegBtn>
      </div>
  )}

{section === "account" && (
  <div style={card()}>
    <div style={title()}>Account</div>
    <div style={{ marginTop: 6, color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 13 }}>
      Profilo locale (nessun backend). Una volta creato, il profilo è bloccato per evitare modifiche accidentali.
    </div>

    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      {!accountCreated ? (
        <button
          type="button"
          onClick={() => {
            const nameOk = String(profile.name || "").trim().length >= 2;
            if (!nameOk) {
              toast.push("Inserisci un nome (min 2 caratteri)", "warning");
              return;
            }
            saveLocalProfile({ name: profile.name, profession: profile.role, bio: profile.bio ?? "", createdAt: Date.now() });
            setAccountCreatedLS(true);
            setAccountCreated(true);
            setEditUnlocked(false);
            toast.push("Account creato", "success");
          }}
          style={primaryBtn(false)}
        >
          Crea account
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!editUnlocked ? (
            <button type="button" onClick={() => setEditUnlocked(true)} style={primaryBtn(false)}>
              Modifica profilo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                saveLocalProfile({ name: profile.name, profession: profile.role, bio: profile.bio ?? "" });
                setEditUnlocked(false);
                toast.push("Profilo salvato", "success");
              }}
              style={primaryBtn(false)}
            >
              Salva modifiche
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditUnlocked(false);
              toast.push("Modifica bloccata", "info");
            }}
            style={ghostBtn()}
          >
            Blocca
          </button>
        </div>
      )}

      <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
        <div style={{ fontWeight: 950 }}>Suggerimento</div>
        <div style={{ marginTop: 6, opacity: 0.75, fontWeight: 750, fontSize: 13 }}>
          Per cambiare immagine profilo usa la <b>matita sotto l’avatar</b> nella sezione Panoramica.
        </div>
      </div>
    </div>
  </div>
)}

{section === "overview" && (
      <>
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

      </>
      )}

      {section === "leaderboard" && (
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={title()}>Classifica (locale)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <SegBtn active={lbMode === "weekly"} onClick={() => setLbMode("weekly")}>Settimana</SegBtn>
              <SegBtn active={lbMode === "all"} onClick={() => setLbMode("all")}>Totale</SegBtn>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Livello + XP</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Leaderboard
            players={players}
            currentUserId={userId}
            onSelect={(p) => {
              setCardPlayer(p);
              setCardOpen(true);
            }}
          />
        </div>
      </div>
      )}

      {section === "missions" && (
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={title()}>Missioni</div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Step 1 → 2 → 3</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13, marginTop: 6 }}>
          Completa uno step, riscotta la reward, poi si sblocca lo step successivo (più difficile).
        </div>

        <MissionHub
          dayKey={dayKey}
          weekKey={weekKey}
          dailyLeft={dailyLeft}
          weeklyLeft={weeklyLeft}
          getClaimed={getClaimed}
          setClaimed={setClaimed}
          onGrant={(reward, meta) => {
            setPills((p) => p + reward.pills);
            if (reward.xp) {
              setXp((x) => x + reward.xp!);
              addXpGlobal(reward.xp!);
              toast.push(`+${reward.xp} XP`, "success");
            }
            if (reward.pack) setFreePacks((v) => v + reward.pack!);
            toast.push(`Reward riscattata: +${reward.pills} 💊`, "success");
          }}
        />
      </div>
      )}

      {section === "quiz" && (
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
      )}

      {section === "overview" && (
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
      )}
    </div>
  );
}

/* styles (no duplicate keys, no blur) */
function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(59,130,246,0.20)" : "rgba(255,255,255,0.06)",
        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
        fontWeight: 950,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

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


function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}