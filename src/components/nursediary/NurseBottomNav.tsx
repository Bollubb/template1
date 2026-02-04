import React from "react";

export type NurseTab = "didattica" | "carte" | "opzioni" | "profilo";

export default function NurseBottomNav({
  active,
  onChange,
}: {
  active: NurseTab;
  onChange: (tab: NurseTab) => void;
}) {
  const items: { key: NurseTab; label: string; icon: React.ReactNode }[] = [
    { key: "didattica", label: "Didattica", icon: <IconBook /> },
    { key: "carte", label: "Carte", icon: <IconCards /> },
    { key: "opzioni", label: "Opzioni", icon: <IconCog /> },
    { key: "profilo", label: "Profilo", icon: <IconUser /> },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 60,
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 18,
        boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
        padding: 8,
        backdropFilter: "blur(10px)",
      }}
      aria-label="NurseDiary Bottom Navigation"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 10px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: isActive ? "rgba(14,165,233,0.14)" : "transparent",
                color: isActive ? "#0369a1" : "rgba(0,0,0,0.70)",
                fontWeight: isActive ? 700 : 600,
                fontSize: 13,
              }}
            >
              <span style={{ display: "inline-flex", width: 18, height: 18 }}>{it.icon}</span>
              <span style={{ whiteSpace: "nowrap" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 19.5V6.5C4 5.4 4.9 4.5 6 4.5H20V20.5H6C4.9 20.5 4 19.6 4 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconCards() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 7h12v14H7V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M5 17H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8 8 0 0 0 .1-6l-2 .5a6.2 6.2 0 0 0-1.2-1.2l.5-2a8 8 0 0 0-6-.1l.5 2a6.2 6.2 0 0 0-1.2 1.2l-2-.5a8 8 0 0 0-.1 6l2-.5c.36.46.76.86 1.2 1.2l-.5 2a8 8 0 0 0 6 .1l-.5-2c.46-.36.86-.76 1.2-1.2l2 .5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
