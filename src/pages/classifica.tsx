import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";
import Leaderboard, { type PlayerCard } from "../components/nursediary/Leaderboard";
import ProfileCardModal from "../components/nursediary/ProfileCardModal";

import { getXp, getWeeklyXpMap } from "@/features/progress/xp";
import { getLocalProfile, getAvatar } from "@/features/profile/profileStore";

function getISOWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function seedLeaderboard(me: PlayerCard): PlayerCard[] {
  const presets = [
    { name: "Sara", profession: "Infermiere", bio: "Turnista, terapia intensiva." },
    { name: "Luca", profession: "OSS", bio: "Reparto medico, focus su comfort." },
    { name: "Giulia", profession: "Infermiere", bio: "Area critica, triage." },
    { name: "Marco", profession: "Studente", bio: "Sto imparando: quiz a manetta." },
    { name: "Elena", profession: "Infermiere", bio: "Wound care & accessi venosi." },
    { name: "Davide", profession: "Medico", bio: "Emergenza-urgenza, amante delle checklist." },
  ];

  const base = Math.max(120, Math.min(1200, (me.totalXp ?? me.xp) + 200));
  return presets.map((p, idx) => {
    const xp = Math.max(0, Math.round(base * (0.55 + idx * 0.12) + (idx % 2 ? 35 : 0)));
    return {
      id: `demo_${idx}_${xp}`,
      name: p.name,
      profession: p.profession,
      bio: p.bio,
      avatar: null,
      xp,
      totalXp: xp + Math.round(base * 1.8),
    };
  });
}

export default function ClassificaPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  const [mode, setMode] = useState<"weekly" | "global">("weekly");
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [meId] = useState<string>("me");
  const [cardOpen, setCardOpen] = useState(false);
  const [cardPlayer, setCardPlayer] = useState<PlayerCard | null>(null);

  // Load/build leaderboard list
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prof = getLocalProfile();
    const avatar = getAvatar();
    const totalXp = getXp();
    const wk = getISOWeekKey(new Date());
    const weeklyMap = getWeeklyXpMap();
    const weeklyXp = weeklyMap[wk] || 0;

    const me: PlayerCard = {
      id: meId,
      name: prof?.name || "Tu",
      profession: prof?.profession || "Infermiere",
      bio: prof?.bio || "",
      avatar: avatar || null,
      xp: mode === "weekly" ? weeklyXp : totalXp,
      totalXp,
    };

    const seeded = seedLeaderboard(me);
    setPlayers([me, ...seeded]);
  }, [meId, mode]);

  const title = useMemo(() => (mode === "weekly" ? "Classifica settimanale" : "Classifica globale"), [mode]);

  return (
    <Page
      title="Classifica"
      headerOverride={{
        title: "Classifica",
        subtitle: mode === "weekly" ? "Settimanale" : "Globale",
        showBack: true,
        onBack: () => router.back(),
      }}
    >
      <Section>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{title}</div>
              <div style={{ opacity: 0.72, fontWeight: 800, fontSize: 12 }}>Tocca un profilo per i dettagli</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setMode("weekly")}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: mode === "weekly" ? "rgba(56,189,248,0.22)" : "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setMode("global")}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: mode === "global" ? "rgba(56,189,248,0.22)" : "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Globale
              </button>
            </div>
          </div>

          <Leaderboard
            players={players}
            currentUserId={meId}
            mode={mode}
            onSelect={(p) => {
              setCardPlayer(p);
              setCardOpen(true);
            }}
          />
        </div>

        {cardPlayer ? (
          <ProfileCardModal open={cardOpen} onClose={() => setCardOpen(false)} player={cardPlayer} />
        ) : null}
      </Section>

      <NurseBottomNav active="profilo" onChange={goTab} />
    </Page>
  );
}
