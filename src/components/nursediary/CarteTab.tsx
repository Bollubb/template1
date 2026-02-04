import React, { useMemo, useState } from "react";

export function CarteTab(): JSX.Element {
  const [msg, setMsg] = useState("Carte: work in progress");

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Carte</div>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>{msg}</div>
      <button
        onClick={() => setMsg("Ok! Qui collegheremo bustine/collezione/pillole.")}
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", background: "white" }}
      >
        Test
      </button>
    </div>
  );
}
