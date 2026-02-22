import Head from "next/head";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";


export type PageProps = { title?: string; children: React.ReactNode; headerOverride?: { title: string; subtitle?: string; showBack?: boolean; onBack?: () => void; }; };

type QuickRoute = "/quiz" | "/utility" | "/missioni" | "/classifica";

export default function Page({ title = "NurseDiary", children, headerOverride }: PageProps): JSX.Element {
  const pageTitle = title ? `NurseDiary | ${title}` : "NurseDiary";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const recomputeMenuPos = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();

    const desiredW = 320;
    const viewportW = Math.max(0, window.innerWidth || 0);
    const w = Math.min(desiredW, Math.max(260, viewportW - 20));

    let left = r.left;
    left = Math.max(10, Math.min(left, viewportW - w - 10));

    const top = Math.max(10, r.bottom + 10);
    setMenuPos({ left, top, width: w });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    requestAnimationFrame(() => recomputeMenuPos());

    const onDown = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      // Allow interactions inside the trigger and inside the popover.
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (popoverRef.current && popoverRef.current.contains(t)) return;
      setMenuOpen(false);
    };

    const onReflow = () => recomputeMenuPos();

    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [menuOpen, recomputeMenuPos]);

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
                  ref={triggerRef}
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

                {/* NOTE: the quick-menu popover is rendered as a fixed layer below (outside the sticky header)
                    to avoid backdrop-filter stacking issues that can make it invisible/non-clickable on some browsers. */}
              </div>

              {/* Right side spacer (future quick actions) */}
              <div style={{ width: 32 }} />
            </div>
          </header>

          {/* Quick menu layer (fixed) */}
          {menuOpen && (
            <>
              <div className="nd-backdrop" style={{ zIndex: 2000 }} onClick={() => setMenuOpen(false)} />
              <div
                ref={popoverRef}
                className="nd-popover nd-pop nd-pop-enter"
                role="menu"
                aria-label="Menu rapido"
                style={{
                  position: "fixed",
                  left: menuPos?.left ?? 14,
                  top: menuPos?.top ?? 66,
                  width: menuPos?.width ?? 320,
                  borderRadius: 18,
                  boxShadow: "0 20px 54px rgba(0,0,0,0.62)",
                  overflow: "hidden",
                  zIndex: 2100,
                  pointerEvents: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
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
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
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

                <div
                  style={{
                    padding: "10px 12px",
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.60)",
                  }}
                >
                  Suggerimento: usa il menu per una home più pulita e focalizzata.
                </div>
              </div>
            </>
          )}

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
