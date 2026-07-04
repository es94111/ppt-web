"use client";
import { useState } from "react";
import { Star } from "lucide-react";

export function FavoriteButton({ deckId, initialFavorite }: { deckId: string; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  async function toggle() {
    const next = !favorite;
    setFavorite(next);
    const response = await fetch(`/api/decks/${deckId}/favorite`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: next }) });
    if (!response.ok) setFavorite(!next);
  }
  return <button className={`btn secondary small favorite-btn${favorite ? " active" : ""}`} onClick={toggle} title={favorite ? "取消收藏" : "收藏"}><Star size={14} />{favorite ? "已收藏" : "收藏"}</button>;
}
