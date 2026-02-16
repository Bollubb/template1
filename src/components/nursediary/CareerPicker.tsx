
"use client";
import { setCareer } from "@/features/career/career";

export default function CareerPicker() {
  const careers = [
    { id: "general", label: "Generale" },
    { id: "emergency", label: "Emergenza" },
    { id: "critical", label: "Area critica" },
    { id: "pediatrics", label: "Pediatria" },
  ];

  return (
    <div style={{ padding: 12, borderRadius: 12, background: "#111" }}>
      <b>Scegli il tuo percorso</b>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {careers.map((c) => (
          <button key={c.id} onClick={() => setCareer(c.id as any)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
