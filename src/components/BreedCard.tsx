import React, { useEffect, useState } from "react";
import styles from "@styles/Breed.module.css";
import getBreeds from "@services/breeds.service";

type Breed = { id?: string; name?: string; description?: string };

export function BreedCard(): JSX.Element {
  const [items, setItems] = useState<Breed[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = (await getBreeds("/")) as any;
        if (!ok) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!ok) return;
        setErr(e?.message ?? "Error");
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  if (err) return <div className={styles.breed}>Error: {err}</div>;
  if (!items.length) return <div className={styles.breed}>No breeds (API placeholder).</div>;

  const b = items[0];
  return (
    <div className={styles.breed}>
      <h2>{b.name ?? "Breed"}</h2>
      <p>{b.description ?? ""}</p>
    </div>
  );
}
