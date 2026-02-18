import React, { useMemo, useState } from "react";

import {
  getAccountCreated,
  getAvatar,
  getLocalProfile,
  saveLocalProfile,
  setAccountCreated,
  setAvatar,
} from "@/features/profile/profileStore";

type Step = 1 | 2 | 3;

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

const ROLE_PRESETS = ["Infermiere", "Studente", "OSS", "Altro"] as const;

function isBrowser() {
  return typeof window !== "undefined";
}

export default function ProfileOnboardingModal({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const initial = useMemo(() => {
    if (!isBrowser()) return { name: "", role: "Infermiere", avatar: null as string | null };
    const p = getLocalProfile();
    return {
      name: (p.name || "").trim(),
      role: (p.profession || "Infermiere").trim() || "Infermiere",
      avatar: getAvatar(),
    };
  }, []);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState<string>(initial.name || "");
  const [role, setRole] = useState<string>(initial.role || "Infermiere");
  const [avatarData, setAvatarData] = useState<string | null>(initial.avatar);
  const [customRole, setCustomRole] = useState<string>("");

  if (!open) return null;
  if (isBrowser() && getAccountCreated()) return null;

  const canNext1 = name.trim().length >= 2;
  const canFinish = true;

  const resolvedRole = (role === "Altro" ? (customRole.trim() || "Altro") : role).slice(0, 26);

  const title = step === 1 ? "Benvenuto in NurseDiary" : step === 2 ? "Che ruolo hai?" : "Scegli un avatar";
  const subtitle = step === 1 ? "Ti basta un minuto per iniziare." : step === 2 ? "Serve solo per personalizzare l’esperienza." : "Puoi cambiarlo quando vuoi.";

  function closeIfAllowed() {
    // modal is blocking during onboarding: no close
  }

  function goNext() {
    if (step === 1 && !canNext1) return;
    if (step === 1) return setStep(2);
    if (step === 2) return setStep(3);
  }

  function finish() {
    if (!canFinish) return;
    try {
      const now = Date.now();
      saveLocalProfile({ name: name.trim().slice(0, 18), profession: resolvedRole, createdAt: now });
      if (avatarData) setAvatar(avatarData);
      setAccountCreated(true);
    } catch {
      // no-op
    }
    onDone();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.70)",
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
      onMouseDown={closeIfAllowed}
    >
      <div
        style={{
          width: "min(520px, calc(100vw - 24px))",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(15,23,42,0.98)",
          boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 980, fontSize: 18 }}>{title}</div>
          <div style={{ opacity: 0.78, fontWeight: 750, marginTop: 4 }}>{subtitle}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  height: 6,
                  flex: 1,
                  borderRadius: 999,
                  background: n <= step ? "rgba(56,189,248,0.85)" : "rgba(255,255,255,0.10)",
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {step === 1 && (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ fontWeight: 900, opacity: 0.9 }}>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Mariano"
                style={inputStyle()}
                autoFocus
              />
              <div style={{ opacity: 0.7, fontWeight: 750, fontSize: 12 }}>Lo puoi cambiare quando vuoi.</div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {ROLE_PRESETS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={chip(role === r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {role === "Altro" && (
                <input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Scrivi il tuo ruolo"
                  style={inputStyle()}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={avatarBox()}>
                    {avatarData ? (
                      <img src={avatarData} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 28 }}>👤</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 980 }}>{name.trim() || "Utente"}</div>
                    <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 13 }}>{resolvedRole}</div>
                  </div>
                </div>
                <label style={smallGhostBtn()}>
                  📷 Carica
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () => setAvatarData(String(r.result || ""));
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                {AVATAR_PRESETS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => setAvatarData(a.data)}
                    style={{
                      borderRadius: 16,
                      border:
                        avatarData === a.data
                          ? "1px solid rgba(56,189,248,0.70)"
                          : "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      padding: 8,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                    aria-label={`Seleziona avatar ${a.label}`}
                  >
                    <img src={a.data} alt={a.label} style={{ width: 42, height: 42, borderRadius: 14 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)))}
            disabled={step === 1}
            style={{ ...smallGhostBtn(), opacity: step === 1 ? 0.35 : 1, cursor: step === 1 ? "not-allowed" : "pointer" }}
          >
            Indietro
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={step === 1 && !canNext1}
              style={primaryBtn(step === 1 && !canNext1)}
            >
              Continua
            </button>
          ) : (
            <button type="button" onClick={finish} style={primaryBtn(false)}>
              Inizia
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 850,
    outline: "none",
  };
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(56,189,248,0.70)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function avatarBox(): React.CSSProperties {
  return {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    display: "grid",
    placeItems: "center",
  };
}

function smallGhostBtn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
    userSelect: "none",
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(56,189,248,0.70)",
    background: disabled ? "rgba(56,189,248,0.10)" : "rgba(56,189,248,0.28)",
    color: "rgba(255,255,255,0.98)",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 110,
  };
}
