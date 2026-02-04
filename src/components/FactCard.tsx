import React, { useEffect, useState } from "react";
import styles from "@styles/Fact.module.css";
import getFacts from "@services/facts.service";

export function FactCard({ count = "1" }: { count?: string }): JSX.Element {
  const [facts, setFacts] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = (await getFacts(`/`)) as any;
        if (!ok) return;
        // If API returns {data:[...]} or array, handle both
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setFacts(arr.slice(0, Number(count) || 1).map((x: any) => String(x?.fact ?? x)));
      } catch (e: any) {
        if (!ok) return;
        setErr(e?.message ?? "Error");
      }
    })();
    return () => { ok = false; };
  }, [count]);

  if (err) return <div className={styles.fact}>Error: {err}</div>;
  if (!facts.length) return <div className={styles.fact}>No facts (API placeholder).</div>;

  return (
    <div className={styles.fact}>
      <ul>
        {facts.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}
