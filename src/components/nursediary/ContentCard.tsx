import React, { useMemo, useState } from "react";
import type { ContentItem } from "@/types/nursediary/types";
import { incDailyCounter } from "@/features/progress/dailyCounters";

export function ContentCard({
  item,
  isFavorite,
  isRead,
  onToggleFavorite,
  onMarkRead,
}: {
  item: ContentItem;
  isFavorite: boolean;
  isRead: boolean;
  onToggleFavorite: (id: string) => void;
  onMarkRead: (id: string) => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  const sharePayload = useMemo(() => {
    const title = item.titolo;
    const text = item.descrizione ? item.descrizione : "";
    const url = item.link ? item.link : "";
    return { title, text, url };
  }, [item.titolo, item.descrizione, item.link]);

  const handleShare = async () => {
    try {
      if (typeof window === "undefined") return;

      // Se ho un link, lo preferisco; altrimenti condivido titolo/descrizione.
      const hasUrl = Boolean(sharePayload.url);

      if (navigator.share) {
        await navigator.share({
          title: sharePayload.title,
          text: sharePayload.text,
          ...(hasUrl ? { url: sharePayload.url } : {}),
        });
        return;
      }

      const toCopy = [sharePayload.title, sharePayload.text, sharePayload.url].filter(Boolean).join("\n");
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op: evitiamo alert invasivi
    }
  };

  const handleOpen = () => {
    onMarkRead(item.id);
    if (!item.link) return;
    if (typeof window === "undefined") return;
    window.open(item.link, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        backgroundColor: "#0b1220", // ✅ OPACO → elimina effetto lente
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {item.titolo}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {item.categoria}
              {item.tag ? ` • ${item.tag}` : ""}
            </div>

            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: isRead ? "rgba(34,197,94,0.10)" : "rgba(250,204,21,0.10)",
                color: isRead ? "rgba(34,197,94,0.95)" : "rgba(250,204,21,0.95)",
                fontWeight: 700,
              }}
            >
              {isRead ? "Letto" : "Nuovo"}
            </span>
          </div>
        </div>

        <button
          onClick={() => onToggleFavorite(item.id)}
          aria-label="toggle favorite"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "6px 10px",
            backgroundColor: "#111827", // opaco
            color: "rgba(255,255,255,0.9)",
            cursor: "pointer",
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      {item.descrizione && (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: 14,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {item.descrizione}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {item.link && (
          <button
            type="button"
            onClick={handleOpen}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "#0ea5e9",
              color: "#020617",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Apri
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "#111827",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {copied ? "Copiato ✓" : "Condividi"}
        </button>

        {!isRead && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "#0b1220",
              color: "rgba(255,255,255,0.82)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Segna letto
          </button>
        )}
      </div>
    </div>
  );
}
