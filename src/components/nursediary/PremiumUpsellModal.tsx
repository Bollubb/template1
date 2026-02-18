import React from "react";
import { setPremium } from "@/features/profile/premium";

export default function PremiumUpsellModal({
  open,
  context,
  title = "Attiva Boost",
  subtitle = "Più progressi, più valore didattico. Nessun paywall aggressivo.",
  bullets = ["2× XP su quiz", "Simulazione concorso estesa", "Analytics avanzate (categorie deboli)"],
  cta = "Attiva Boost (demo)",
  secondaryCta,
  onSecondary,
  onClose,
}: {
  open: boolean;
  context?: "quiz" | "utility" | "cards" | "generic";
  title?: string;
  subtitle?: string;
  bullets?: string[];
  cta?: string;
  secondaryCta?: string;
  onSecondary?: (() => void) | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const resolved = (() => {
    const isDefaultTitle = title === "Attiva Boost";
    const isDefaultSubtitle = subtitle === "Più progressi, più valore didattico. Nessun paywall aggressivo.";
    const isDefaultBullets = Array.isArray(bullets) && bullets.join("|") === ["2× XP su quiz", "Simulazione concorso estesa", "Analytics avanzate (categorie deboli)"].join("|");

    if (context === "quiz") {
      return {
        title: isDefaultTitle ? "Sblocca la Simulazione" : title,
        subtitle: isDefaultSubtitle ? "Allenati in modo serio: simulazione completa + riprova errori." : subtitle,
        bullets: isDefaultBullets ? ["Simulazione esame (20 domande)", "Riprova solo errori", "2× XP sui quiz"] : bullets,
      };
    }
    if (context === "utility") {
      return {
        title: isDefaultTitle ? "Sblocca strumenti avanzati" : title,
        subtitle: isDefaultSubtitle ? "Anteprima gratuita, poi accesso completo con Boost." : subtitle,
        bullets: isDefaultBullets ? ["Interazioni farmacologiche estese", "Ricerca più rapida", "2× XP"] : bullets,
      };
    }
    if (context === "cards") {
      return {
        title: isDefaultTitle ? "Boost carte" : title,
        subtitle: isDefaultSubtitle ? "Più progressi e qualche extra nello shop." : subtitle,
        bullets: isDefaultBullets ? ["Bustina Premium", "2× XP", "Reward milestone migliorati"] : bullets,
      };
    }
    return { title, subtitle, bullets };
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.72)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "radial-gradient(1200px 220px at 30% -10%, rgba(56,189,248,0.18), transparent 60%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.92))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 18, color: "rgba(255,255,255,0.95)" }}>{resolved.title}</div>
            <div style={{ marginTop: 6, fontWeight: 750, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{resolved.subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.86)",
              fontWeight: 900,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {resolved.bullets.map((b, i) => (
            <div
              key={i}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                padding: "10px 12px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 12, background: "rgba(56,189,248,0.16)", display: "grid", placeItems: "center" }}>
                ⭐
              </div>
              <div style={{ fontWeight: 850, color: "rgba(255,255,255,0.88)" }}>{b}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setPremium(true);
              onClose();
            }}
            style={{
              flex: "1 1 200px",
              borderRadius: 18,
              border: "1px solid rgba(245,158,11,0.35)",
              background: "linear-gradient(180deg, rgba(245,158,11,1), rgba(234,88,12,0.98))",
              color: "#1f1300",
              fontWeight: 950,
              padding: "12px 14px",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(245,158,11,0.20)",
            }}
          >
            {cta}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSecondary) onSecondary();
              else onClose();
            }}
            style={{
              flex: "1 1 160px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.90)",
              fontWeight: 900,
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            {secondaryCta || "Non ora"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 750, color: "rgba(255,255,255,0.55)" }}>
          Nota: in questa fase è un flag locale (demo). In futuro si collegherà agli acquisti / abbonamento.
        </div>
      </div>
    </div>
  );
}
