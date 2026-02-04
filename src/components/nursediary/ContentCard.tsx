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
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{item.titolo}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{item.categoria}{item.tag ? ` • ${item.tag}` : ""}</div>
        </div>
        <button
          onClick={() => onToggleFavorite(item.id)}
          aria-label="toggle favorite"
          style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 10px", background: "white" }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      {item.descrizione ? <p style={{ marginTop: 8, marginBottom: 0 }}>{item.descrizione}</p> : null}

      {item.link ? (
        <div style={{ marginTop: 8 }}>
          <a href={item.link} target="_blank" rel="noreferrer">Apri</a>
        </div>
      ) : null}
    </div>
  );
}
