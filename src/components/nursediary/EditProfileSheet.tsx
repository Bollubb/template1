import React, { useMemo, useState } from "react";

type Draft = {
  name: string;
  role: string;
  bio: string;
  avatar: string | null;
};

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

export default function EditProfileSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Draft;
  onClose: () => void;
  onSave: (next: Draft) => void;
}) {
  const init = useMemo(() => initial, [initial]);
  const [name, setName] = useState<string>(init.name || "Utente");
  const [role, setRole] = useState<string>(init.role || "Infermiere");
  const [customRole, setCustomRole] = useState<string>("");
  const [bio, setBio] = useState<string>(init.bio || "");
  const [avatar, setAvatar] = useState<string | null>(init.avatar || null);

  if (!open) return null;

  const resolvedRole = (role === "Altro" ? (customRole.trim() || "Altro") : role).slice(0, 26);
  const trimmedName = (name || "").trim().slice(0, 18) || "Utente";
  const trimmedBio = (bio || "").slice(0, 160);

  function pickFile(f: File) {
    const r = new FileReader();
    r.onload = () => setAvatar(String(r.result || ""));
    r.readAsDataURL(f);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.60)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(15,23,42,0.98)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 980 }}>Modifica profilo</div>
            <button type="button" onClick={onClose} style={ghostBtn()}>
              ✕
            </button>
          </div>

          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={avatarBox()}>{avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>👤</span>}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={ghostBtn()}>
                  📷 Carica
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                  />
                </label>
                <button type="button" onClick={() => setAvatar(null)} style={{ ...ghostBtn(), opacity: 0.85 }}>
                  Rimuovi
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              {AVATAR_PRESETS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAvatar(a.data)}
                  style={{
                    borderRadius: 16,
                    border: avatar === a.data ? "1px solid rgba(56,189,248,0.70)" : "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    padding: 8,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img src={a.data} alt={a.label} style={{ width: 38, height: 38, borderRadius: 14 }} />
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={lbl()}>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={input()} placeholder="Nome" />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={lbl()}>Ruolo</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {ROLE_PRESETS.map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={chip(role === r)}>
                    {r}
                  </button>
                ))}
              </div>
              {role === "Altro" && (
                <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} style={input()} placeholder="Scrivi il tuo ruolo" />
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={lbl()}>Bio (opzionale)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...input(), minHeight: 78, resize: "vertical" }}
                placeholder="Breve descrizione (max 160 caratteri)"
              />
              <div style={{ opacity: 0.65, fontWeight: 800, fontSize: 12 }}>{trimmedBio.length}/160</div>
            </div>
          </div>

          <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button type="button" onClick={onClose} style={ghostBtn()}>
              Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                onSave({ name: trimmedName, role: resolvedRole, bio: trimmedBio, avatar });
              }}
              style={primaryBtn()}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lbl(): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.9 };
}

function input(): React.CSSProperties {
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

function ghostBtn(): React.CSSProperties {
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

function primaryBtn(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(56,189,248,0.70)",
    background: "rgba(56,189,248,0.28)",
    color: "rgba(255,255,255,0.98)",
    fontWeight: 950,
    cursor: "pointer",
    minWidth: 110,
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
    flex: "0 0 auto",
  };
}
