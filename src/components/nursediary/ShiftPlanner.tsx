import React, { useEffect, useMemo, useState } from "react";

type ShiftCode = "M" | "P" | "N" | "R" | "F" | ""; // Mattina, Pomeriggio, Notte, Riposo, Ferie, empty

type ShiftItem = {
  code: ShiftCode;
  note?: string;
};

const LS_KEY = "nd_shifts_v1";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function card(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  };
}

function pillStyle(code: ShiftCode): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    padding: "2px 6px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 1.1,
  };

  if (code === "M") return { ...base, background: "rgba(56,189,248,0.18)" }; // morning
  if (code === "P") return { ...base, background: "rgba(250,204,21,0.18)" }; // afternoon
  if (code === "N") return { ...base, background: "rgba(167,139,250,0.20)" }; // night
  if (code === "R") return { ...base, background: "rgba(34,197,94,0.16)" }; // rest
  if (code === "F") return { ...base, background: "rgba(248,113,113,0.18)" }; // ferie
  return base;
}

function codeLabel(code: ShiftCode) {
  if (code === "M") return "M";
  if (code === "P") return "P";
  if (code === "N") return "N";
  if (code === "R") return "R";
  if (code === "F") return "F";
  return "";
}

function codeLong(code: ShiftCode) {
  if (code === "M") return "Mattina";
  if (code === "P") return "Pomeriggio";
  if (code === "N") return "Notte";
  if (code === "R") return "Riposo";
  if (code === "F") return "Ferie";
  return "Nessuno";
}

function smallBtn(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

export default function ShiftPlanner(): JSX.Element {
  const [todayKey, setTodayKey] = useState<string>("");
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [map, setMap] = useState<Record<string, ShiftItem>>({});
  const [editing, setEditing] = useState<{ key: string; open: boolean }>({ key: "", open: false });

  // load
  useEffect(() => {
    if (!isBrowser()) return;
    setTodayKey(ymd(new Date()));
    const loaded = safeJson<Record<string, ShiftItem>>(localStorage.getItem(LS_KEY), {});
    setMap(loaded || {});
  }, []);

  // persist
  useEffect(() => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(map));
    } catch {}
  }, [map]);

  const monthStart = useMemo(() => startOfMonth(viewMonth), [viewMonth]);
  const monthEnd = useMemo(() => endOfMonth(viewMonth), [viewMonth]);
  const firstDayIndex = useMemo(() => {
    // Monday-first (IT): 0..6
    const js = monthStart.getDay(); // 0 Sun
    return (js + 6) % 7;
  }, [monthStart]);

  const days = useMemo(() => {
    const total = monthEnd.getDate();
    const arr: Array<{ date: Date; key: string }> = [];
    for (let i = 1; i <= total; i++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i);
      arr.push({ date: d, key: ymd(d) });
    }
    return arr;
  }, [monthStart, monthEnd]);

  const grid = useMemo(() => {
    const slots: Array<{ date?: Date; key?: string }> = [];
    for (let i = 0; i < firstDayIndex; i++) slots.push({});
    days.forEach((d) => slots.push({ date: d.date, key: d.key }));
    // complete 6 rows
    while (slots.length % 7 !== 0) slots.push({});
    while (slots.length < 42) slots.push({});
    return slots.slice(0, 42);
  }, [firstDayIndex, days]);

  const todayShift = map[todayKey]?.code || "";

  const setShift = (key: string, code: ShiftCode) => {
    setMap((m) => {
      const next = { ...m };
      if (!code) {
        delete next[key];
      } else {
        next[key] = { ...(next[key] || {}), code };
      }
      return next;
    });
  };

  const openEdit = (key: string) => setEditing({ key, open: true });
  const closeEdit = () => setEditing({ key: "", open: false });

  return (
    <div style={card()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Organizzatore turni</div>
          <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 12 }}>
            Oggi: <span style={{ fontWeight: 950 }}>{todayKey || "—"}</span>{" "}
            {todayShift ? <span style={{ marginLeft: 6, ...pillStyle(todayShift) }}>{codeLabel(todayShift)}</span> : <span style={{ marginLeft: 6, opacity: 0.8 }}>(non impostato)</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))} style={smallBtn()}>
            ‹
          </button>
          <button type="button" onClick={() => setViewMonth(startOfMonth(new Date()))} style={smallBtn()}>
            Oggi
          </button>
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} style={smallBtn()}>
            ›
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, fontWeight: 950, textTransform: "capitalize", opacity: 0.92 }}>{monthLabel(viewMonth)}</div>

      <div style={{ marginTop: 10, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {["L", "M", "M", "G", "V", "S", "D"].map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 950, opacity: 0.75, textAlign: "center" }}>
            {d}
          </div>
        ))}

        {grid.map((slot, i) => {
          const key = slot.key || "";
          const day = slot.date?.getDate();
          const isToday = !!key && key === todayKey;
          const item = key ? map[key] : undefined;
          const code = (item?.code || "") as ShiftCode;

          return (
            <button
              key={i}
              type="button"
              onClick={() => (key ? openEdit(key) : undefined)}
              disabled={!key}
              style={{
                height: 46,
                width: "100%",
                minWidth: 0,
                borderRadius: 14,
                border: isToday ? "1px solid rgba(56,189,248,0.60)" : "1px solid rgba(255,255,255,0.10)",
                background: key ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.02)",
                color: "rgba(255,255,255,0.92)",
                padding: 8,
                cursor: key ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: isToday ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
                opacity: key ? 1 : 0.35,
                boxSizing: "border-box",
              }}
              aria-label={key ? `Imposta turno ${key}` : "Vuoto"}
            >
              <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.95 }}>{day || ""}</div>
              {code ? <div style={pillStyle(code)}>{codeLabel(code)}</div> : <div style={{ fontSize: 11, opacity: 0.35 }}>+</div>}
            </button>
          );
        })}
        </div>
      </div>

      {/* Edit modal */}
      {editing.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9998,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={closeEdit}
        >
          <div
            style={{
              width: "min(520px, calc(100vw - 24px))",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(18,18,18,0.98)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>Turno del {editing.key}</div>
                <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 12 }}>Tocca un’opzione per salvare</div>
              </div>
              <button type="button" onClick={closeEdit} style={{ ...smallBtn(), padding: "8px 10px" }}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {(["M", "P", "N", "R", "F"] as ShiftCode[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setShift(editing.key, c);
                    closeEdit();
                  }}
                  style={{
                    ...smallBtn(),
                    padding: "12px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ fontWeight: 950 }}>{codeLong(c)}</span>
                  <span style={pillStyle(c)}>{codeLabel(c)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShift(editing.key, "");
                  closeEdit();
                }}
                style={{ ...smallBtn(), padding: "12px 12px", opacity: 0.9 }}
              >
                Rimuovi turno
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.6, fontSize: 11, fontWeight: 700 }}>
              Suggerimento: usa <b>M</b>/<b>P</b>/<b>N</b> per i turni, <b>R</b> riposo, <b>F</b> ferie.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
