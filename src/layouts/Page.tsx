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
                <button type="button" onClick={() => { setMenuOpen((v) => !v); }} aria-label="Apri menu" className="nd-header-trigger nd-press">
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
                    <div className="nd-popover nd-pop nd-quickmenu">
                    <div className="nd-quickmenu-head">
                      <div className="nd-quickmenu-title">Sezioni</div>
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
                          className="nd-quickmenu-item nd-press">
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
