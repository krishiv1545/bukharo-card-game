import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardT } from "./types";

const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 } as const;

/** The hand's order is purely a client-side presentation. It survives refreshes via localStorage. */
export function useHandOrder(storageKey: string, hand: CardT[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[]; } catch { return []; }
  });
  const [autoCenter, setAutoCenter] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem(`${storageKey}:auto-center`) ?? "false") as boolean; } catch { return false; }
  });
  const prevIdsRef = useRef<string[]>(hand.map((c) => c.id));

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* storage unavailable */ } }, [storageKey, order]);
  useEffect(() => { try { localStorage.setItem(`${storageKey}:auto-center`, JSON.stringify(autoCenter)); } catch { /* storage unavailable */ } }, [storageKey, autoCenter]);

  useEffect(() => {
    if (!autoCenter) {
      prevIdsRef.current = hand.map((c) => c.id);
      return;
    }

    const currentIds = hand.map((c) => c.id);
    const prevSet = new Set(prevIdsRef.current);
    const newIds = currentIds.filter((id) => !prevSet.has(id));
    if (newIds.length > 0 && prevIdsRef.current.length > 0) {
      setOrder((prev) => {
        const currentOrder = prev.filter((id) => currentIds.includes(id));
        const next = [...currentOrder];
        const insertAt = Math.max(0, Math.floor(next.length / 2));
        next.splice(insertAt, 0, ...newIds);
        return next;
      });
    }

    prevIdsRef.current = currentIds;
  }, [autoCenter, hand]);

  const cards = useMemo(() => {
    const byId = new Map(hand.map((c) => [c.id, c]));
    const kept = order.filter((id) => byId.has(id));
    const known = new Set(kept);
    return [...kept, ...hand.filter((c) => !known.has(c.id)).map((c) => c.id)].map((id) => byId.get(id)!);
  }, [hand, order]);

  const move = useCallback((id: string, beforeId: string | null) => {
    const ids = cards.map((c) => c.id).filter((x) => x !== id);
    const at = beforeId === null ? ids.length : ids.indexOf(beforeId);
    ids.splice(at < 0 ? ids.length : at, 0, id);
    setOrder(ids);
  }, [cards]);

  const sortBy = useCallback((mode: "suit" | "rank") => {
    setOrder([...cards].sort((a, b) => mode === "suit"
      ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank
      : a.rank - b.rank || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]).map((c) => c.id));
  }, [cards]);

  return { cards, move, sortBy, autoCenter, setAutoCenter };
}
