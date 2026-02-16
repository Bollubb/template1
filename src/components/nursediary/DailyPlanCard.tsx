
"use client";
import { getDailyDone, completeDaily } from "@/features/daily/dailyPlan";

export default function DailyPlanCard() {
  const done = getDailyDone();

  return (
    <div style={{ padding: 12, borderRadius: 12, background: "#111" }}>
      <b>Daily Plan</b>
      <p>Task completati oggi: {done}/3</p>
      <button onClick={completeDaily}>Completa task</button>
    </div>
  );
}
