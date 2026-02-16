import React, { useEffect } from "react";

export default function CelebrationPop({
  open,
  icon,
  title,
  subtitle,
  onClose,
  accent = "rgba(34,197,94,0.9)",
}: {
  open: boolean;
  icon: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  accent?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, 1400);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes nd_pop_in {
          0% { transform: translateY(8px) scale(0.92); opacity: 0; }
          60% { transform: translateY(0px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes nd_glow {
          0% { box-shadow: 0 0 0 rgba(0,0,0,0); }
          100% { box-shadow: 0 16px 42px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.14); }
        }
      `}</style>
      <div
        onClick={onClose}
        role="button"
        aria-label="chiudi"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          display: "grid",
          placeItems: "center",
          background: "rgba(2,6,23,0.45)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            width: "min(420px, calc(100vw - 28px))",
            borderRadius: 22,
            padding: "14px 14px",
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(255,255,255,0.14)",
            animation: "nd_pop_in 220ms ease-out both, nd_glow 220ms ease-out both",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${accent}`,
                boxShadow: `0 0 0 3px rgba(255,255,255,0.04) inset`,
                fontSize: 26,
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 950, fontSize: 16, color: "rgba(255,255,255,0.96)" }}>{title}</div>
              {subtitle ? (
                <div style={{ marginTop: 2, fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.78)" }}>{subtitle}</div>
              ) : null}
            </div>
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "100%", background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.25))` }} />
          </div>
        </div>
      </div>
    </>
  );
}
