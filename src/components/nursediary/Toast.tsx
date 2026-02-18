import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastType = "info" | "success" | "warning" | "error";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  ts: number;
  /** ms */
  duration?: number;
};

type ToastContextType = {
  show: (message: string) => void;
  push: (message: string, type?: ToastType, opts?: { duration?: number }) => void;
  clear: () => void;
};

const LS_KEY = "nd_toasts_v1";
const MAX_AGE_MS = 12_000;

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  push: () => {},
  clear: () => {},
});

export const useToast = () => useContext(ToastContext);

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function iconFor(type: ToastType) {
  if (type === "success") return "✅";
  if (type === "warning") return "⚠️";
  if (type === "error") return "⛔";
  return "ℹ️";
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  // Rehydrate recently queued toasts (useful if a reward happens right before reload/navigation)
  useEffect(() => {
    if (!isBrowser()) return;
    const items = safeJson<ToastItem[]>(localStorage.getItem(LS_KEY), []);
    const now = Date.now();
    const fresh = items.filter((t) => now - (t.ts || 0) <= MAX_AGE_MS).slice(-3);
    if (fresh.length) setToasts(fresh);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  const clear = () => {
    setToasts([]);
    // clear timers
    Object.values(timers.current).forEach((id) => window.clearTimeout(id));
    timers.current = {};
  };

  const scheduleRemove = (id: string, duration: number) => {
    if (!isBrowser()) return;
    if (timers.current[id]) window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      delete timers.current[id];
    }, duration);
  };

  const push = (message: string, type: ToastType = "info", opts?: { duration?: number }) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const duration = Math.max(1600, Math.min(8000, opts?.duration ?? 3200));
    const item: ToastItem = { id, message, type, ts: Date.now(), duration };
    setToasts((t) => [...t, item].slice(-4));

    // persist briefly (so a fast navigation doesn't lose it)
    if (isBrowser()) {
      try {
        const existing = safeJson<ToastItem[]>(localStorage.getItem(LS_KEY), []);
        localStorage.setItem(LS_KEY, JSON.stringify([...existing, item].slice(-6)));
      } catch {}
      scheduleRemove(id, duration);
    }
  };

  const show = (message: string) => push(message, "info");

  const rendered = useMemo(() => {
    return toasts.map((t) => {
      const tone =
        t.type === "success"
          ? { bg: "rgba(34,197,94,0.18)", br: "rgba(34,197,94,0.35)" }
          : t.type === "warning"
          ? { bg: "rgba(245,158,11,0.16)", br: "rgba(245,158,11,0.35)" }
          : t.type === "error"
          ? { bg: "rgba(239,68,68,0.16)", br: "rgba(239,68,68,0.35)" }
          : { bg: "rgba(255,255,255,0.08)", br: "rgba(255,255,255,0.14)" };

      return (
        <div
          key={t.id}
          style={{
            borderRadius: 14,
            border: `1px solid ${tone.br}`,
            background: tone.bg,
            padding: "10px 12px",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 850,
            display: "flex",
            gap: 10,
            alignItems: "center",
            boxShadow: "0 16px 36px rgba(0,0,0,0.40)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ width: 22, textAlign: "center" }}>{iconFor(t.type)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.2 }}>{t.message}</div>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            style={{
              marginLeft: "auto",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.85)",
              borderRadius: 10,
              padding: "6px 8px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      );
    });
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ show, push, clear }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "grid",
          gap: 8,
          width: "min(520px, calc(100vw - 24px))",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "grid", gap: 8, pointerEvents: "auto" }}>{rendered}</div>
      </div>
    </ToastContext.Provider>
  );
};
