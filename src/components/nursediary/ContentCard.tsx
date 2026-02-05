import React from "react";
import type { ContentItem } from "@/types/nursediary/types";

export function ContentCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: ContentItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}): JSX.Element {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{item.titolo}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
            {item.categoria}
            {item.tag ? ` • ${item.tag}` : ""}
          </div>
        </div>
        <button
          onClick={() => onToggleFavorite(item.id)}
          aria-label="toggle favorite"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "6px 10px",
            background: "rgba(2,6,23,0.35)",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      {item.descrizione ? (
        <p style={{ marginTop: 8, marginBottom: 0, color: "rgba(255,255,255,0.85)" }}>{item.descrizione}</p>
      ) : null}

      {item.link ? (
        <div style={{ marginTop: 10 }}>
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(14,165,233,0.18)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Apri
          </a>
        </div>
      ) : null}
    </div>
  );
}
