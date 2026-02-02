import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type ContentItem = {
  id: string;
  titolo: string;
  categoria: string;
  tag: string;
  descrizione: string;
  contenuto: string;
  link: string;
  immagine: string;
  tipo: string;
  premium: string;
};

function safe(v: any) {
  return typeof v === "string" ? v : "";
}

function parseCSV(csvText: string): ContentItem[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1);

  return rows
    .map((row) => {
      const cols = row.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] ?? "";
      });
      return obj as ContentItem;
    })
    .filter((x) => safe(x.id).trim().length > 0);
}

export default function ContentDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/contenuti.csv", { cache: "no-store" });
        const text = await res.text();
        setItems(parseCSV(text));
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const item = useMemo(() => {
    const sid = safe(id).trim();
    if (!sid) return null;
    return items.find((x) => safe(x.id).trim() === sid) ?? null;
  }, [items, id]);

  const tags = useMemo(() => {
    if (!item) return [];
    return safe(item.tag)
      .split(";")
      .join(",")
      .split("|")
      .join(",")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [item]);

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px 16px 56px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.06)",
          cursor: "pointer",
        }}
      >
        ← Indietro
      </button>

      <div style={{ height: 14 }} />

      {loading ? (
        <p style={{ opacity: 0.75 }}>Caricamento…</p>
      ) : !item ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Contenuto non trovato</h1>
          <p style={{ opacity: 0.75, marginBottom: 0 }}>
            Verifica che l’ID esista nel CSV.
          </p>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 22,
            padding: 18,
            background: "rgba(255,255,255,0.04)",
            boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, letterSpacing: -0.3 }}>{safe(item.titolo)}</h1>
            <span style={{ opacity: 0.7, fontSize: 13 }}>
              {safe(item.categoria)} {safe(item.premium).toUpperCase() === "TRUE" ? "• Premium 🔒" : ""}
            </span>
          </div>

          {safe(item.descrizione) ? (
            <p style={{ opacity: 0.85, lineHeight: 1.5, marginTop: 12 }}>
              {safe(item.descrizione)}
            </p>
          ) : null}

          {tags.length ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {tags.slice(0, 12).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    opacity: 0.85,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* Contenuto esteso (se in futuro vuoi mettere testo/checklist) */}
          {safe(item.contenuto) ? (
            <>
              <div style={{ height: 14 }} />
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  opacity: 0.9,
                }}
              >
                {safe(item.contenuto)}
              </div>
            </>
          ) : null}

          <div style={{ height: 16 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {safe(item.link) ? (
              <a
                href={safe(item.link)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  textDecoration: "none",
                }}
              >
                Apri su Instagram / risorsa ↗
              </a>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
