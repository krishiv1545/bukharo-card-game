import { useEffect, useRef, useState } from "react";
import type { ComboV, GameV, CardT } from "../types";
import { CardBack, CardFace } from "./Card";

interface Props {
  game: GameV; me: string; hasSelection: boolean; selected: Set<string>;
  onExtend: (comboId: string, ids: string[]) => void; onDiscardDrop: (id: string) => void;
  onTakeDiscard: () => void; onDraw: () => void;
}

const dropIds = (e: React.DragEvent, selected: Set<string>) => {
  const id = e.dataTransfer.getData("text/plain");
  return id ? (selected.has(id) ? [...selected] : [id]) : [];
};

function Opponent({
  p,
  current,
  prevCount,
}: {
  p: import("../types").PlayerV;
  current: boolean;
  prevCount?: number;
}) {
  const isGaining = prevCount !== undefined && p.hand_count > prevCount;
  return (
    <div
      className={`rounded-lg p-2 transition-all duration-300 ${
        isGaining
          ? "bg-amber-400/30 ring-2 ring-amber-300 shadow-md scale-[1.02]"
          : current
            ? "bg-amber-400/25 ring-2 ring-amber-400 shadow-amber-400/20 shadow-lg"
            : "bg-black/20"
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <b>{p.id}</b>
        <span className="opacity-70">{p.hand_count} cards</span>
        {current && <span className="rounded bg-amber-400 px-1.5 text-xs font-bold text-black">TURN</span>}
        <span className={`rounded px-1.5 text-xs ${p.opened ? "bg-emerald-600" : "bg-slate-600"}`}>{p.opened ? "opened" : "not opened"}</span>
        {p.claimed_sets.length > 0 && <span className="rounded bg-sky-700 px-1.5 text-xs">sets: {p.claimed_sets.map((i) => i + 1).join(",")}</span>}
      </div>
      <div
        className="flex"
        style={{ ["--cw" as string]: "clamp(22px, 2.6vw, 38px)" }}
      >
        {Array.from({ length: p.hand_count }, (_, i) => {
          const isNewCard = prevCount !== undefined && i >= prevCount;
          return (
            <div
              key={i}
              className={isNewCard ? "animate-slide-into-opponent" : ""}
              style={{
                marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.65)",
              }}
            >
              <CardBack />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClosedPileCards({ c }: { c: ComboV }) {
  const wild = new Set(c.wild_ids);
  const n = c.cards.length;
  // Show all cards as a layered stack with alternating slight skew
  return (
    <div className="relative" style={{ width: "calc(var(--cw) + 24px)", height: "calc(var(--cw) * 1.4 + 16px)" }}>
      {c.cards.map((card, i) => (
        <CardFace key={card.id} card={card} wild={wild.has(card.id)}
          style={{
            position: "absolute",
            left: `${i * (20 / Math.max(n - 1, 1))}px`,
            top: `${i * -2}px`,
            transform: `rotate(${(i - (n - 1) / 2) * 2.5}deg)`,
            zIndex: i,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }} />
      ))}
    </div>
  );
}

function Combo({ c, mine, canExtend, selected, onExtend }: {
  c: ComboV; mine: boolean; canExtend: boolean; selected: Set<string>; onExtend: (ids: string[]) => void;
}) {
  const isSet = c.kind === "set";

  const outerClass = [
    "rounded-lg p-2 transition-all",
    c.closed
      ? "bg-emerald-900/60 ring-2 ring-emerald-400 shadow-emerald-400/30 shadow-md"
      : "bg-black/15",
    canExtend ? "cursor-pointer hover:bg-white/15 ring-2 ring-amber-300/70 active:scale-95 touch-manipulation" : "",
  ].join(" ");

  return (
    <div className={outerClass}
      onClick={() => canExtend && onExtend([...selected])}
      onDragOver={(e) => mine && e.preventDefault()}
      onDrop={(e) => { const ids = dropIds(e, selected); if (mine && ids.length) onExtend(ids); }}
      title={mine && !c.closed ? "Click with cards selected, or drop cards here, to add" : undefined}>
      <div style={{ ["--cw" as string]: "clamp(30px, 3.6vw, 52px)" }}>
        {c.closed ? (
          <ClosedPileCards c={c} />
        ) : (
          <div className="flex items-end pl-1 pt-2">
            {c.cards.map((card, i) => {
              const wild = new Set(c.wild_ids);
              return (
                <CardFace key={card.id} card={card} wild={wild.has(card.id)}
                  style={isSet
                    ? { marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.6)", transform: `rotate(${(i - (c.cards.length - 1) / 2) * 5}deg)`, transformOrigin: "bottom center" }
                    : { marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.62)" }} />
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-1 text-[11px] flex items-center gap-1 opacity-80">
        <span>{c.kind}</span>
        {c.closed && <span className="rounded bg-emerald-500 px-1 text-[10px] font-bold text-white">CLOSED</span>}
        {c.wild_ids.length > 0 && <span className="opacity-70">dirty</span>}
        <span className="opacity-60">· {c.creator}</span>
      </div>
    </div>
  );
}

function DiscardViewer({
  discard,
  isPinned,
  isHolding,
  onClose,
}: {
  discard: CardT[];
  isPinned: boolean;
  isHolding: boolean;
  onClose: () => void;
}) {
  return (
    <div className="relative flex flex-col max-h-[78vh] w-[92vw] max-w-md rounded-2xl bg-[#182c23] p-3.5 sm:p-4 text-slate-100 shadow-2xl ring-1 ring-white/15 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-amber-300">Discard Pile</span>
          <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/40">
            {discard.length} {discard.length === 1 ? "card" : "cards"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-300/70 hidden sm:inline">
            Oldest → Top
          </span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div
        className="flex flex-wrap gap-2 overflow-y-auto p-2 bg-black/30 rounded-xl max-h-[52vh]"
        style={{ ["--cw" as string]: "clamp(36px, 8.5vw, 46px)" }}
      >
        {discard.map((c, i) => {
          const isTop = i === discard.length - 1;
          const isBottom = i === 0;
          return (
            <div key={c.id} className="relative transition-transform hover:scale-105">
              <CardFace card={c} />
              {isTop && (
                <span className="absolute -top-1.5 -right-1 rounded bg-amber-400 px-1 text-[9px] font-bold text-black shadow ring-1 ring-black/40">
                  TOP
                </span>
              )}
              {isBottom && discard.length > 1 && (
                <span className="absolute -bottom-1 -left-1 rounded bg-slate-600 px-1 text-[8px] font-bold text-slate-200 opacity-90 shadow">
                  1st
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Total: {discard.length} cards</span>
        <span className="text-amber-200/80">
          {isPinned ? "Click ✕ or outside to close" : isHolding ? "Release finger to close" : "Move cursor away to close"}
        </span>
      </div>
    </div>
  );
}

export function Table({ game, me, hasSelection, selected, onExtend, onDiscardDrop, onTakeDiscard, onDraw }: Props) {
  const myTurn = game.current === me;
  const myTeam = game.players.find((p) => p.id === me)?.team;
  const teams = [...new Set(game.players.map((p) => p.team))];
  const top = game.discard[game.discard.length - 1];
  const canExtend = (c: ComboV) => myTurn && game.phase === "play" && hasSelection && c.team === myTeam && !c.closed;

  const [isHovered, setIsHovered] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const prevGameRef = useRef<GameV | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [recentDiscardId, setRecentDiscardId] = useState<string | null>(null);
  const [prevOpponentCounts, setPrevOpponentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const prev = prevGameRef.current;
    prevGameRef.current = game;
    if (!prev) {
      setPrevOpponentCounts(Object.fromEntries(game.players.map((p) => [p.id, p.hand_count])));
      return;
    }

    if (game.draw_count < prev.draw_count) {
      setIsDrawing(true);
      setTimeout(() => setIsDrawing(false), 380);
    }

    if (game.discard.length > prev.discard.length && game.discard.length > 0) {
      const topId = game.discard[game.discard.length - 1].id;
      setRecentDiscardId(topId);
      setTimeout(() => setRecentDiscardId(null), 500);
    }

    setPrevOpponentCounts(Object.fromEntries(prev.players.map((p) => [p.id, p.hand_count])));
  }, [game]);

  useEffect(() => {
    if (isHovered && pileRef.current) {
      const rect = pileRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(window.innerWidth - 32, 440);
      const popoverHeight = 300;
      let left = rect.left - 10;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      let top = rect.top - popoverHeight - 12;
      if (top < 16) {
        top = rect.bottom + 12;
      }
      setPopoverPos({ top, left });
    }
  }, [isHovered]);

  const startHold = () => {
    if (game.discard.length === 0) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      setIsHolding(true);
    }, 180);
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  const isViewerOpen = (isPinned || isHolding || isHovered) && game.discard.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-2 sm:p-3">
      <div className="flex flex-wrap gap-2">
        {game.players.filter((p) => p.id !== me).map((p) => (
          <Opponent
            key={p.id}
            p={p}
            current={game.current === p.id}
            prevCount={prevOpponentCounts[p.id]}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6" style={{ ["--cw" as string]: "clamp(40px, 4.8vw, 70px)" }}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-center text-xs">
            <button disabled={!(myTurn && game.phase === "draw")} onClick={onDraw} title="Draw one card"
              className="relative block disabled:opacity-60 enabled:ring-2 enabled:ring-amber-400 rounded-md transition-all active:scale-95 touch-manipulation">
              <CardBack />
              {isDrawing && (
                <div className="absolute inset-0 pointer-events-none animate-slide-out-deck z-10">
                  <CardBack />
                </div>
              )}
            </button>
            <div className="mt-1 font-medium">Draw ({game.draw_count})</div>
          </div>

          <div className="text-center text-xs">
            <div
              ref={pileRef}
              className="group relative cursor-pointer select-none"
              onMouseEnter={() => { if (game.discard.length > 0) setIsHovered(true); }}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={startHold}
              onTouchEnd={endHold}
              onTouchCancel={endHold}
              onContextMenu={(e) => { if (game.discard.length > 0) e.preventDefault(); }}
              onClick={() => { if (game.discard.length > 0) setIsPinned((p) => !p); }}
              title={game.discard.length > 0 ? "Hover or hold to view all cards in discard pile" : undefined}
            >
              <div
                className="flex min-h-[calc(var(--cw)*1.4)] min-w-[var(--cw)] items-center rounded-md border border-dashed border-white/40 transition-colors group-hover:border-amber-400/80 group-hover:bg-white/5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) onDiscardDrop(id); }}
              >
                {game.discard.slice(-5).map((c, i, arr) => {
                  const isTop = i === arr.length - 1;
                  const isRecent = isTop && c.id === recentDiscardId;
                  return (
                    <div
                      key={c.id}
                      className={isRecent ? "animate-slide-into-place" : ""}
                      style={{ marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.7)" }}
                    >
                      <CardFace card={c} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-center gap-1 font-medium">
              <span>Discard ({game.discard.length}){!top && " · empty"}</span>
              {game.discard.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPinned((p) => !p);
                  }}
                  className="rounded bg-amber-400/20 px-1 py-0.2 text-[10px] font-semibold text-amber-300 hover:bg-amber-400/30 transition-colors"
                  title="View all discarded cards"
                >
                  view all
                </button>
              )}
            </div>

            <button
              disabled={!(myTurn && game.phase === "draw" && game.discard.length > 0)}
              onClick={onTakeDiscard}
              className="mt-1 rounded bg-amber-400 px-2 py-0.5 font-semibold text-black disabled:opacity-40 transition-opacity active:scale-95 touch-manipulation"
            >
              Take pile
            </button>
          </div>
        </div>

        <div className="text-xs sm:text-sm flex-1 min-w-[140px]">
          {game.phase === "over" ? <b>Game over</b> : myTurn
            ? <b className="text-amber-300">Your turn: {game.phase === "draw" ? "draw a card" : "lay down, then discard or press down"}</b>
            : <span>Waiting for <b>{game.current}</b>…</span>}
        </div>
      </div>

      {/* Discard Pile Viewer Popup / Modal */}
      {isViewerOpen && (
        isPinned || isHolding ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && isPinned) setIsPinned(false);
            }}
          >
            <DiscardViewer
              discard={game.discard}
              isPinned={isPinned}
              isHolding={isHolding}
              onClose={() => { setIsPinned(false); setIsHolding(false); }}
            />
          </div>
        ) : (
          <div
            className="fixed z-50 pointer-events-auto shadow-2xl animate-in fade-in duration-150"
            style={popoverPos ? { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` } : undefined}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <DiscardViewer
              discard={game.discard}
              isPinned={false}
              isHolding={false}
              onClose={() => setIsHovered(false)}
            />
          </div>
        )
      )}

      {teams.map((t) => {
        const members = game.players.filter((p) => p.team === t).map((p) => p.id).join(", ");
        const combos = game.combos.filter((c) => c.team === t);
        const isMyTeam = t === myTeam;
        return (
          <section key={t}>
            <h3 className={`mb-2 text-sm font-semibold ${isMyTeam ? "text-amber-300" : "opacity-80"}`}>
              {t === members ? members : `Team ${t} (${members})`}
            </h3>
            <div className="flex flex-wrap gap-3">
              {combos.length === 0 && <span className="text-xs opacity-50">nothing laid down yet</span>}
              {combos.map((c) => (
                <Combo key={c.id} c={c}
                  mine={c.team === myTeam && myTurn && game.phase === "play"}
                  canExtend={canExtend(c)}
                  selected={selected}
                  onExtend={(ids) => onExtend(c.id, ids)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
