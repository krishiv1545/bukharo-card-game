import { useEffect, useMemo, useRef, useState } from "react";
import { fireCelebrationConfetti, firePileBurst } from "./confetti";
import { Hand } from "./components/Hand";
import { Lobby } from "./components/Lobby";
import { Sidebar } from "./components/Sidebar";
import { Table } from "./components/Table";
import { THEMES } from "./theme";
import { useHandOrder } from "./useHandOrder";
import { useRoom } from "./useRoom";
import { useTheme } from "./useTheme";
import type { CardT } from "./types";

const NO_CARDS: CardT[] = [];

const COLS: [string, string][] = [
  ["laid_points", "Laid"], ["clean_sevens", "Clean 7"], ["dirty_sevens", "Dirty 7"],
  ["seven_aces", "Aces"], ["seven_twos", "Seven 2s"], ["press_downs", "Press"], ["hand_penalty", "Hand -"], ["total", "Total"],
];

function ResultModal({ game, me, onClose }: { game: import("./types").GameV; me: string; onClose: () => void }) {
  const myTeam = game.players.find(p => p.id === me)?.team;
  const result = game.result;
  const winner = result
    ? Object.entries(result).sort((a, b) => b[1].total - a[1].total)[0]?.[0]
    : null;
  const isWinner = winner === myTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#1a3028] p-5 sm:p-6 shadow-2xl ring-1 ring-white/10">
        <button onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          title="Close">
          ✕
        </button>

        {isWinner ? (
          <>
            <div className="text-center text-4xl sm:text-5xl mb-1">🏆</div>
            <h2 className="text-center text-2xl sm:text-3xl font-bold text-amber-400 mb-1">Victory!</h2>
            <p className="text-center text-xs sm:text-sm text-amber-200/70 mb-3 sm:mb-4">Your team won the round.</p>
          </>
        ) : (
          <>
            <div className="text-center text-4xl sm:text-5xl mb-1">🎴</div>
            <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-300 mb-1">Round Over</h2>
            <p className="text-center text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">Better luck next time.</p>
          </>
        )}

        {result && (
          <div className="space-y-2.5 sm:space-y-3">
            {Object.entries(result).map(([team, b]) => {
              const isMe = team === myTeam;
              const isTop = team === winner;
              return (
                <div key={team}
                  className={`rounded-lg p-2.5 sm:p-3 ${isMe ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "bg-black/30"}`}>
                  <div className={`font-bold mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base ${isMe ? "text-amber-300" : ""}`}>
                    {team}
                    {isMe && <span className="text-xs opacity-70">(you)</span>}
                    {isTop && <span className="ml-auto text-xs rounded bg-amber-400 px-1.5 py-0.5 text-black font-bold">WINNER</span>}
                  </div>
                  {COLS.map(([k, l]) => {
                    const val = (b as unknown as Record<string, number>)[k];
                    const isTotal = k === "total";
                    return (
                      <div key={k}
                        className={`flex justify-between text-xs ${
                          isTotal
                            ? "mt-1 rounded bg-amber-400/20 px-2 py-1 font-bold text-amber-200 ring-1 ring-amber-400/40"
                            : "opacity-80"
                        }`}>
                        <span>{l}</span>
                        <span>{val}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoomView({ code, me, leave }: { code: string; me: string; leave: () => void }) {
  const { state, error, online, denied, send, clearError, chat, sendChat } = useRoom(code);
  const game = state?.game ?? null;
  const { cards, move, sortBy, autoCenter, setAutoCenter } = useHandOrder(`bukharo:${code}:${me}`, game?.my_hand ?? NO_CARDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickedCardIds, setPickedCardIds] = useState<Set<string>>(new Set());
  const prevMyHandIdsRef = useRef<Set<string>>(new Set());
  const prevTurnPhaseRef = useRef<{ current: string; phase: string } | null>(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(chat.length);
  const { themeId, setThemeId } = useTheme();

  useEffect(() => {
    if (!game) {
      setPickedCardIds(new Set());
      prevTurnPhaseRef.current = null;
      prevMyHandIdsRef.current = new Set();
      return;
    }

    const currentHandIds = new Set(game.my_hand.map((c) => c.id));

    if (game.current !== me || game.phase === "over") {
      setPickedCardIds(new Set());
    } else if (game.phase === "draw") {
      setPickedCardIds(new Set());
      prevMyHandIdsRef.current = currentHandIds;
    } else if (game.phase === "play") {
      const prev = prevTurnPhaseRef.current;
      if (prev?.current === me && prev?.phase === "draw") {
        const newlyAdded = game.my_hand.filter((c) => !prevMyHandIdsRef.current.has(c.id)).map((c) => c.id);
        if (newlyAdded.length > 0) {
          setPickedCardIds(new Set(newlyAdded));
        }
      } else {
        setPickedCardIds((existing) => {
          if (existing.size === 0) return existing;
          const filtered = new Set([...existing].filter((id) => currentHandIds.has(id)));
          return filtered.size === existing.size ? existing : filtered;
        });
      }
    }

    prevTurnPhaseRef.current = { current: game.current, phase: game.phase };
    if (game.phase !== "play") {
      prevMyHandIdsRef.current = currentHandIds;
    }
  }, [game, me]);

  useEffect(() => {
    if (sidebarOpen) {
      setLastSeenChatCount(chat.length);
    }
  }, [sidebarOpen, chat.length]);

  const unreadChatCount = sidebarOpen ? 0 : Math.max(0, chat.length - lastSeenChatCount);
  const availableSets = game?.sets.filter(s => s.status === "available").length ?? 0;

  // Track closed combos to fire confetti when a pile gets closed
  const closedRef = useRef(new Set<string>());
  // Track if we already fired victory confetti this session
  const victoryCelebrated = useRef(false);

  useEffect(() => {
    if (!game) return;
    const newlyClosed = game.combos.filter(c => c.closed && !closedRef.current.has(c.id));
    if (newlyClosed.length > 0) {
      firePileBurst();
      newlyClosed.forEach(c => closedRef.current.add(c.id));
    }
    game.combos.forEach(c => { if (c.closed) closedRef.current.add(c.id); });
  }, [game]);

  // Victory confetti when game ends (once per session/component mount)
  useEffect(() => {
    if (game?.phase === "over" && !victoryCelebrated.current) {
      victoryCelebrated.current = true;
      const myTeam = game.players.find(p => p.id === me)?.team;
      const winner = game.result
        ? Object.entries(game.result).sort((a, b) => b[1].total - a[1].total)[0]?.[0]
        : null;
      if (winner && winner === myTeam) {
        setTimeout(fireCelebrationConfetti, 400);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase]);

  useEffect(() => {   // drop selections of cards that left the hand
    const ids = new Set(cards.map((c) => c.id));
    setSelected((s) => (s.size && [...s].some((i) => !ids.has(i)) ? new Set([...s].filter((i) => ids.has(i))) : s));
  }, [cards]);
  useEffect(() => { if (error) { const t = setTimeout(clearError, 4000); return () => clearTimeout(t); } }, [error, clearError]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  const myTurn = !!game && game.current === me;
  const act = (a: object) => { send(a); setSelected(new Set()); };
  const ids = useMemo(() => [...selected], [selected]);

  if (denied) return <div className="p-4 sm:p-8 text-center">You are not in this room. <button className="underline font-semibold" onClick={leave}>Back</button></div>;
  if (!state) return <div className="p-4 sm:p-8 text-center">Connecting…</div>;

  return (
    <div className="flex h-screen h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-1 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-1 text-xs shrink-0 select-none" style={{ background: "var(--panel)" }}>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <b className="font-bold tracking-wide">Bukharo</b>
          <span className="truncate max-w-[70px] sm:max-w-[120px] opacity-80" title={me}>{me}</span>
          <span className="flex items-center gap-1" title={online ? "Connected" : "Reconnecting"}>
            <span className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
            <span className={`hidden sm:inline ${online ? "text-emerald-300" : "text-red-300"}`}>
              {online ? "connected" : "reconnecting…"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {game && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden relative flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/20 active:scale-95 transition-all touch-manipulation"
              title="Open scoreboard, sets and chat"
            >
              <span>💬 Info</span>
              {unreadChatCount > 0 ? (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                  {unreadChatCount}
                </span>
              ) : availableSets > 0 ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title={`${availableSets} sets open`} />
              ) : null}
            </button>
          )}

          <label className="flex items-center gap-1 sm:gap-2 text-[11px] text-slate-200/80">
            <span className="hidden sm:inline">Theme</span>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[11px] sm:text-xs text-slate-100 outline-none transition-colors hover:bg-black/40 max-w-[90px] sm:max-w-none"
              aria-label="Theme"
            >
              {THEMES.map(theme => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </label>
          <button className="underline opacity-70 hover:opacity-100 text-[11px] sm:text-xs px-1" onClick={leave}>Leave</button>
        </div>
      </header>
      {error && <div className="bg-red-700 px-3 py-1 text-xs sm:text-sm cursor-pointer shrink-0" onClick={clearError}>{error}</div>}

      {state.room.status === "lobby" || !game ? (
        <div className="flex-1 overflow-y-auto"><Lobby room={state.room} me={me} send={send} /></div>
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <Table game={game} me={me} hasSelection={selected.size > 0} selected={selected}
              onDraw={() => send({ type: "DRAW" })} onTakeDiscard={() => send({ type: "TAKE_DISCARD" })}
              onExtend={(comboId, cardIds) => act({ type: "EXTEND_COMBINATION", combo_id: comboId, card_ids: cardIds })}
              onDiscardDrop={(id) => act({ type: "DISCARD", card_id: id })} />

            {/* Desktop Sidebar: stays in normal flex layout on md+ */}
            <Sidebar
              game={game} code={code} me={me} chat={chat} sendChat={sendChat}
              className="hidden md:flex w-64 shrink-0 bg-black/25"
            />

            {/* Mobile Sidebar: slide-over drawer on < md */}
            {sidebarOpen && (
              <div className="fixed inset-0 z-40 flex justify-end md:hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="relative z-10 flex h-full w-[85vw] max-w-xs flex-col bg-[#14231b] shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-right duration-200">
                  <Sidebar
                    game={game} code={code} me={me} chat={chat} sendChat={sendChat}
                    className="w-full flex-1 bg-transparent"
                    onClose={() => setSidebarOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 bg-black/30 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 pt-2 text-xs sm:text-sm">
              <button disabled={!myTurn || game.phase !== "play" || selected.size < 3}
                onClick={() => act({ type: "CREATE_COMBINATION", card_ids: ids })}
                className="rounded bg-emerald-600 px-2.5 py-1.5 sm:px-3 sm:py-1 font-semibold disabled:opacity-40 transition-all hover:bg-emerald-500 active:scale-95 touch-manipulation">
                Lay down ({selected.size})
              </button>
              <button disabled={!myTurn || game.phase !== "play" || selected.size !== 1}
                onClick={() => act({ type: "DISCARD", card_id: ids[0] })}
                className="rounded bg-rose-600 px-2.5 py-1.5 sm:px-3 sm:py-1 font-semibold disabled:opacity-40 transition-all hover:bg-rose-500 active:scale-95 touch-manipulation">
                Discard selected
              </button>
              <button disabled={!myTurn || game.phase !== "play" || game.my_hand.length !== 1}
                onClick={() => act({ type: "PRESS_DOWN" })}
                className="rounded bg-violet-600 px-2.5 py-1.5 sm:px-3 sm:py-1 font-semibold disabled:opacity-40 transition-all hover:bg-violet-500 active:scale-95 touch-manipulation">
                Press down
              </button>
              <button disabled={selected.size === 0} onClick={() => setSelected(new Set())}
                className="rounded bg-black/30 px-2 py-1.5 sm:py-1 disabled:opacity-40 transition-all hover:bg-black/50 active:scale-95 touch-manipulation">
                Clear
              </button>
              <span className="hidden lg:inline text-xs opacity-60">
                Select cards then click a pile to add, or drag onto it. Drag to the discard pile to discard.
              </span>
              <span className="inline lg:hidden text-[11px] opacity-60">
                Tap cards to select, then lay down, discard, or tap a pile to add.
              </span>
            </div>
            <Hand cards={cards} selected={selected} pickedCardIds={pickedCardIds} toggle={toggle} move={move} sortBy={sortBy} autoCenter={autoCenter} setAutoCenter={setAutoCenter} />
          </div>

          {/* Victory / Defeat modal */}
          {game.phase === "over" && !resultDismissed && (
            <ResultModal game={game} me={me} onClose={() => setResultDismissed(true)} />
          )}
        </>
      )}
    </div>
  );
}
