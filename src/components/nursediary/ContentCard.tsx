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
        <div>
          <div
            style={{
              fontWeight: 800,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {item.titolo}
          </div>

          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {item.categoria}
            {item.tag ? ` • ${item.tag}` : ""}
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

      {item.link && (
        <div style={{ marginTop: 12 }}>
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "#0ea5e9",
              color: "#020617",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Apri
          </a>
        </div>
      )}
    </div>
  );
}
