import React, { useMemo, useState } from "react";

import {
  getLocalProfile,
  saveLocalProfile,
  getAvatar as getAvatarLS,
  setAvatar as setAvatarLS,
  setAccountCreated as setAccountCreatedLS,
} from "@/features/profile/profileStore";

type Props = {
  onCreated: () => void;
};

const AVATAR_PRESETS: { key: string; label: string; svg: React.ReactNode }[] = [
  {
    key: "blue",
    label: "Blu",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "green",
    label: "Verde",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 13c2.761 0 5-2.239 5-5S14.761 3 12 3 7 5.239 7 8s2.239 5 5 5Z" stroke="currentColor" strokeWidth="2" />
        <path d="M4 21c1.5-4.5 5-7 8-7s6.5 2.5 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "amber",
    label: "Ambra",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M6 21c1.3-3.8 3.9-6 6-6s4.7 2.2 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
];

export default function ProfileOnboardingModal({ onCreated }: Props) {
  const initial = useMemo(() => {
    const p = getLocalProfile();
    return {
      name: (p.name || "").trim(),
      profession: (p.profession || "").trim() || "Infermiere",
      bio: (p.bio || "").trim(),
      avatar: getAvatarLS() || "blue",
    };
  }, []);

  const [name, setName] = useState(initial.name);
  const [profession, setProfession] = useState(initial.profession);
  const [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [error, setError] = useState<string | null>(null);

  const canContinue = name.trim().length >= 2;

  const save = () => {
    const n = name.trim();
    if (n.length < 2) {
      setError("Inserisci un nome (min 2 caratteri).");
      return;
    }
    setError(null);

    saveLocalProfile({
      name: n,
      profession: (profession || "").trim() || "Infermiere",
      bio: (bio || "").trim(),
      createdAt: Date.now(),
    });
    setAvatarLS(avatar);
    setAccountCreatedLS(true);
    onCreated();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(15,23,42,0.98)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 950, fontSize: 18, color: "rgba(255,255,255,0.95)" }}>Crea il tuo profilo</div>
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>
            Ci vogliono 10 secondi. Serve per personalizzare l’app e mantenere i progressi su questo dispositivo.
          </div>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Avatar</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {AVATAR_PRESETS.map((a) => {
                const isActive = avatar === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAvatar(a.key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: isActive ? "1px solid rgba(14,165,233,0.60)" : "1px solid rgba(255,255,255,0.10)",
                      background: isActive ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.90)",
                      cursor: "pointer",
                      fontWeight: 850,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.06)",
                      }}
                    >
                      {a.svg}
                    </span>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Nome</div>
              <div style={{ fontWeight: 750, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{name.trim().length}/18</div>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 18))}
              placeholder="Es. Mariano"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
                fontWeight: 800,
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Ruolo</div>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
                fontWeight: 800,
              }}
            >
              <option value="Infermiere">Infermiere</option>
              <option value="Studente">Studente</option>
              <option value="OSS">OSS</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Breve descrizione (opzionale)</div>
              <div style={{ fontWeight: 750, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{bio.length}/80</div>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 80))}
              placeholder="Es. Terapia intensiva, appassionato di farmacologia…"
              rows={3}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
                resize: "none",
                fontWeight: 750,
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(245,158,11,0.35)",
                background: "rgba(245,158,11,0.10)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.55)", fontWeight: 750, fontSize: 12 }}>
            In futuro potrai collegare un account per backup/sync.
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!canContinue}
            style={{
              padding: "12px 16px",
              borderRadius: 16,
              border: "none",
              cursor: canContinue ? "pointer" : "not-allowed",
              background: canContinue ? "#22c55e" : "rgba(34,197,94,0.30)",
              color: "#05210f",
              fontWeight: 950,
              minWidth: 160,
            }}
          >
            Continua
          </button>
        </div>
      </div>
    </div>
  );
}
