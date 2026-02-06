import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastKind = "info" | "success" | "warning";

export type ToastItem = {
  id: string;
  title: string;
  kind: ToastKind;
};

type ToastCtx = {
  push: (title: string, kind?: ToastKind) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((title: string, kind: ToastKind = "info") => {
    const id = uid();
    const next: ToastItem = { id, title, kind };
    setItems((prev) => [next, ...prev].slice(0, 3));

    // auto dismiss
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={(id) => setItems((prev) => prev.filter((t) => t.id !== id))} />
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return { push: () => {} };
  }
  return ctx;
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  // mobile-first: bottom-left above bottom nav
  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: "auto",
        bottom: 84, // leave space for bottom nav
        zIndex: 999,
        display: "grid",
        gap: 8,
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((t, idx) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(15,23,42,0.96)",
            padding: "10px 12px",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 900,
            maxWidth: 320,
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
            transform: `translateX(${Math.min(14, idx * 4)}px)`,
            transition: "transform 180ms ease, opacity 180ms ease",
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span style={{ marginRight: 8 }}>{icon(t.kind)}</span>
          {t.title}
        </div>
      ))}
    </div>
  );
}

function icon(kind: ToastKind) {
  if (kind === "success") return "✅";
  if (kind === "warning") return "⚠️";
  return "✨";
}
