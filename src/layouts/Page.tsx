import Head from "next/head";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";


export type PageProps = { title?: string; children: React.ReactNode; headerOverride?: { title: string; subtitle?: string; showBack?: boolean; onBack?: () => void; }; };

type QuickRoute = "/quiz" | "/utility" | "/missioni" | "/classifica";

export default function Page({ title = "NurseDiary", children, headerOverride }: PageProps): JSX.Element {
  const pageTitle = title ? `NurseDiary | ${title}` : "NurseDiary";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const items = useMemo(
    () =>
      [
        { label: "Quiz", sub: "Daily, Weekly, Simulazione", icon: "🧠", href: "/quiz" as const },
        { label: "Utility", sub: "Calcoli e strumenti", icon: "🛠️", href: "/utility" as const },
        { label: "Missioni", sub: "Obiettivi e ricompense", icon: "🎯", href: "/missioni" as const },
        { label: "Classifica", sub: "Settimanale / Globale", icon: "🏆", href: "/classifica" as const },
      ] as const,
    []
  );

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="theme-color" content="#020617" />
      </Head>

        <div className="nd-app">
          <header className="nd-header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              {/* Logo + dropdown trigger */}
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    // Always toggle quick menu. Back navigation (if any) is handled by a dedicated button.
                    setMenuOpen((v) => !v);
                  }}
                  aria-label="Apri menu"
                  className="nd-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(10,12,18,0.62)",
                    color: "rgba(255,255,255,0.94)",
                    padding: "8px 10px",
                    borderRadius: 14,
                    cursor: "pointer",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.42)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {headerOverride?.showBack && headerOverride.onBack ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        headerOverride.onBack && headerOverride.onBack();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          headerOverride.onBack && headerOverride.onBack();
                        }
                      }}
                      aria-label="Indietro"
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.14)",
                        fontSize: 16,
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      ←
                    </span>
                  ) : null}
                  <img src="/logo.png" alt="NurseDiary" width={26} height={26} style={{ borderRadius: 8 }} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05 }}>
                    <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.2 }}>{headerOverride?.title ?? "NurseDiary"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{headerOverride?.subtitle ?? "Menu rapido"}</div>
                  </div>
                  <div style={{ marginLeft: 2, color: "rgba(255,255,255,0.70)", fontSize: 14 }}>{menuOpen ? "▲" : "▼"}</div>
                </button>

                {menuOpen && (
                  <>
                    <div className="nd-backdrop" style={{ zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                    <div
                    className="nd-popover nd-pop"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "calc(100% + 10px)",
                      width: 298,
                      borderRadius: 18,
                      boxShadow: "0 20px 54px rgba(0,0,0,0.62)",
                      overflow: "hidden",
                      zIndex: 60,
                    }}
                  >
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>Sezioni</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                        Vai direttamente a quiz, missioni, classifica e utility.
                      </div>
                    </div>

                    <div style={{ padding: 8, display: "grid", gap: 6 }}>
                      {items.map((it) => (
                        <button
                          key={it.label}
                          type="button"
                          onClick={() => {
                            router.push(it.href as QuickRoute);
                            setMenuOpen(false);
                          }}
                          className="nd-press"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 10px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.92)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.06)" }}>
                            <span style={{ fontSize: 16 }}>{it.icon}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 850, fontSize: 13 }}>{it.label}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{it.sub}</div>
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.55)" }}>→</div>
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.10)", fontSize: 11, color: "rgba(255,255,255,0.60)" }}>
                      Suggerimento: usa il menu per una home più pulita e focalizzata.
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* Right side spacer (future quick actions) */}
              <div style={{ width: 32 }} />
            </div>
          </header>

          <main style={{ paddingBottom: 96 }}>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 14px" }}>{children}</div>
          </main>

          <footer style={{ padding: "18px 16px", color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
            <small>© {new Date().getFullYear()} NurseDiary</small>
          </footer>
        </div>
      
    </>
  );
}
