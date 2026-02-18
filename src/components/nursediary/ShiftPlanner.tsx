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

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function shiftMeta(code: ShiftCode): { short: string; long: string; time?: string; bg: string; border: string } {
  const base = { short: "", long: "Nessuno", time: undefined as string | undefined, bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.14)" };
  if (code === "M") return { ...base, short: "M", long: "Mattina", time: "07–14", bg: "rgba(56,189,248,0.18)", border: "rgba(56,189,248,0.45)" };
  if (code === "P") return { ...base, short: "P", long: "Pomeriggio", time: "14–22", bg: "rgba(250,204,21,0.18)", border: "rgba(250,204,21,0.42)" };
  if (code === "N") return { ...base, short: "N", long: "Notte", time: "22–07", bg: "rgba(167,139,250,0.20)", border: "rgba(167,139,250,0.45)" };
  if (code === "R") return { ...base, short: "R", long: "Riposo", time: undefined, bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.40)" };
  if (code === "F") return { ...base, short: "F", long: "Ferie", time: undefined, bg: "rgba(248,113,113,0.18)", border: "rgba(248,113,113,0.42)" };
  return base;
}

function card(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  };
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

function bigShiftPill(code: ShiftCode): React.CSSProperties {
  const m = shiftMeta(code);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${m.border}`,
    background: m.bg,
    color: "rgba(255,255,255,0.96)",
    fontWeight: 950,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
  };
}

function calendarChip(code: ShiftCode): React.CSSProperties {
  const m = shiftMeta(code);
  return {
    width: 24,
    height: 24,
    borderRadius: 999,
    border: `1px solid ${m.border}`,
    background: m.bg,
    color: "rgba(255,255,255,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: 12,
    lineHeight: 1,
    padding: 0,
    boxSizing: "border-box",
    userSelect: "none",
  };
}

function nextPill(code: ShiftCode): React.CSSProperties {
  const m = shiftMeta(code);
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${m.border}`,
    background: m.bg,
    color: "rgba(255,255,255,0.95)",
    fontWeight: 950,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
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
    localStorage.setItem(LS_KEY, JSON.stringify(map || {}));
  }, [map]);

  const monthStart = useMemo(() => startOfMonth(viewMonth), [viewMonth]);

  const firstDayIndex = useMemo(() => {
    // Monday = 0 ... Sunday = 6
    const js = monthStart.getDay(); // 0..6 (Sun..Sat)
    return (js + 6) % 7;
  }, [monthStart]);

  const monthEnd = useMemo(() => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0), [monthStart]);

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
    while (slots.length % 7 !== 0) slots.push({});
    while (slots.length < 42) slots.push({});
    return slots.slice(0, 42);
  }, [firstDayIndex, days]);

  const todayShift = (map[todayKey]?.code || "") as ShiftCode;

  const next3 = useMemo(() => {
    const out: Array<{ key: string; label: string; code: ShiftCode }> = [];
    if (!todayKey) return out;
    const base = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const k = ymd(d);
      const c = ((map[k]?.code || "") as ShiftCode) || "";
      out.push({ key: k, label: dayLabel(d), code: c });
    }
    return out;
  }, [map, todayKey]);

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

  const editCode = (editing.key && (map[editing.key]?.code || "")) as ShiftCode;

  return (
    <div style={card()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Organizzatore turni</div>
          <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 12 }}>Pianifica e tieni traccia del turno.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))} style={smallBtn()} aria-label="Mese precedente">
            ‹
          </button>
          <button type="button" onClick={() => setViewMonth(startOfMonth(new Date()))} style={smallBtn()} aria-label="Vai a oggi">
            Oggi
          </button>
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} style={smallBtn()} aria-label="Mese successivo">
            ›
          </button>
        </div>
      </div>

      {/* Today big */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 950, opacity: 0.9, fontSize: 12 }}>Turno di oggi</div>
          {todayShift ? (
            <div style={bigShiftPill(todayShift)}>
              <span style={{ fontSize: 12, opacity: 0.92 }}>{shiftMeta(todayShift).short}</span>
              <span style={{ fontSize: 14 }}>{shiftMeta(todayShift).long}</span>
              {shiftMeta(todayShift).time && <span style={{ fontSize: 12, opacity: 0.78 }}>• {shiftMeta(todayShift).time}</span>}
            </div>
          ) : (
            <div style={{ ...bigShiftPill(""), opacity: 0.85 }}>
              <span style={{ fontSize: 14 }}>Non impostato</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openEdit(todayKey)}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 950,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Modifica oggi
        </button>
      </div>

      {/* Next 3 */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.86 }}>Prossimi turni</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {next3.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => openEdit(n.key)}
              style={{
                ...nextPill(n.code),
                cursor: "pointer",
              }}
              aria-label={`Imposta turno ${n.label}`}
            >
              <span style={{ opacity: 0.85 }}>{n.label}</span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>•</span>
              <span style={{ fontSize: 12 }}>{n.code ? shiftMeta(n.code).long : "—"}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, fontWeight: 950, textTransform: "capitalize", opacity: 0.92 }}>{monthLabel(viewMonth)}</div>

      {/* Calendar */}
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
            const code = (key ? (map[key]?.code || "") : "") as ShiftCode;

            return (
              <button
                key={i}
                type="button"
                onClick={() => (key ? openEdit(key) : undefined)}
                disabled={!key}
                style={{
                  position: "relative",
                  height: 48,
                  width: "100%",
                  minWidth: 0,
                  borderRadius: 14,
                  border: isToday ? "1px solid rgba(56,189,248,0.60)" : "1px solid rgba(255,255,255,0.10)",
                  background: key ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.02)",
                  color: "rgba(255,255,255,0.92)",
                  padding: 8,
                  cursor: key ? "pointer" : "default",
                  boxShadow: isToday ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
                  opacity: key ? 1 : 0.35,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
                aria-label={key ? `Imposta turno ${key}` : "Vuoto"}
              >
                <div style={{ position: "absolute", left: 10, top: 8, fontWeight: 950, fontSize: 12, opacity: 0.95 }}>{day || ""}</div>

                {code ? (
                  <div style={{ position: "absolute", right: 8, bottom: 8 }}>
                    <div style={calendarChip(code)}>{shiftMeta(code).short}</div>
                  </div>
                ) : (
                  <div style={{ position: "absolute", right: 10, bottom: 8, fontSize: 14, opacity: 0.18, fontWeight: 900 }}>+</div>
                )}
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
              <div style={{ fontWeight: 950, fontSize: 14 }}>Imposta turno</div>
              <button type="button" onClick={closeEdit} style={smallBtn()}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 800, fontSize: 12 }}>{editing.key}</div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {(["M", "P", "N", "R", "F"] as ShiftCode[]).map((c) => {
                const m = shiftMeta(c);
                const active = editCode === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setShift(editing.key, c);
                      closeEdit();
                    }}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 16,
                      border: active ? `1px solid ${m.border}` : "1px solid rgba(255,255,255,0.12)",
                      background: active ? m.bg : "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      fontWeight: 950,
                    }}
                    aria-label={m.long}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span style={calendarChip(c)}>{m.short}</span>
                      <span style={{ fontSize: 13 }}>{m.long}</span>
                    </span>
                    {m.time && <span style={{ fontSize: 12, opacity: 0.75 }}>{m.time}</span>}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setShift(editing.key, "");
                  closeEdit();
                }}
                style={{
                  gridColumn: "1 / -1",
                  padding: "12px 12px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 950,
                }}
              >
                Rimuovi turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
