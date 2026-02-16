import React from "react";

// ✅ Bottom bar: Home / Didattica / Carte / Profilo
export type NurseTab = "home" | "didattica" | "carte" | "profilo";

export default function NurseBottomNav({
  active,
  onChange,
}: {
  active: NurseTab;
  onChange: (tab: NurseTab) => void;
}) {
  const items: { key: NurseTab; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: "Home", icon: <IconHome /> },
    { key: "didattica", label: "Didattica", icon: <IconBook /> },
    { key: "carte", label: "Carte", icon: <IconCards /> },
    { key: "profilo", label: "Profilo", icon: <IconUser /> },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        padding: "10px 12px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        background: "transparent",
        // ❗️No backdrop-filter
      }}
      aria-label="NurseDiary Bottom Navigation"
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 18,
          boxShadow: "0 10px 25px rgba(0,0,0,0.30)",
          padding: 8,
        }}
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
                background: isActive ? "rgba(14,165,233,0.18)" : "transparent",
                // ✅ readable on dark bottom bar
                color: isActive ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.72)",
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
      </div>
    </nav>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 20v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9.5 21.5v-6h5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
