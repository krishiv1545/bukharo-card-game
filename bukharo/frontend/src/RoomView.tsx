import { useEffect, useMemo, useRef, useState } from "react";
import { fireCelebrationConfetti, firePileBurst } from "./confetti";
import { Hand } from "./components/Hand";
import { Lobby } from "./components/Lobby";
import { Sidebar } from "./components/Sidebar";
import { Table } from "./components/Table";
import { useHandOrder } from "./useHandOrder";
import { useRoom } from "./useRoom";
import type { CardT } from "./types";

const NO_CARDS: CardT[] = [];

const COLS: [string, string][] = [
  ["laid_points", "Laid"], ["clean_sevens", "Clean 7"], ["dirty_sevens", "Dirty 7"],
  ["seven_aces", "Aces"], ["press_downs", "Press"], ["hand_penalty", "Hand -"], ["total", "Total"],
];

function ResultModal({ game, me, onClose }: { game: import("./types").GameV; me: string; onClose: () => void }) {
  const myTeam = game.players.find(p => p.id === me)?.team;
  const result = game.result;
  const winner = result
    ? Object.entries(result).sort((a, b) => b[1].total - a[1].total)[0]?.[0]
    : null;
  const isWinner = winner === myTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1a3028] p-6 shadow-2xl ring-1 ring-white/10">
        <button onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          title="Close">
          ✕
        </button>

        {isWinner ? (
          <>
            <div className="text-center text-5xl mb-1">🏆</div>
            <h2 className="text-center text-3xl font-bold text-amber-400 mb-1">Victory!</h2>
            <p className="text-center text-sm text-amber-200/70 mb-4">Your team won the round.</p>
          </>
        ) : (
          <>
            <div className="text-center text-5xl mb-1">🎴</div>
            <h2 className="text-center text-3xl font-bold text-slate-300 mb-1">Round Over</h2>
            <p className="text-center text-sm text-slate-400 mb-4">Better luck next time.</p>
          </>
        )}

        {result && (
          <div className="space-y-3">
            {Object.entries(result).map(([team, b]) => {
              const isMe = team === myTeam;
              const isTop = team === winner;
              return (
                <div key={team}
                  className={`rounded-lg p-3 ${isMe ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "bg-black/30"}`}>
                  <div className={`font-bold mb-2 flex items-center gap-2 ${isMe ? "text-amber-300" : ""}`}>
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
  const { cards, move, sortBy } = useHandOrder(`bukharo:${code}:${me}`, game?.my_hand ?? NO_CARDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resultDismissed, setResultDismissed] = useState(false);

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

  if (denied) return <div className="p-8">You are not in this room. <button className="underline" onClick={leave}>Back</button></div>;
  if (!state) return <div className="p-8">Connecting…</div>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 bg-black/30 px-3 py-1 text-xs">
        <b>Bukharo</b><span>{me}</span>
        <span className={online ? "text-emerald-300" : "text-red-300"}>{online ? "connected" : "reconnecting…"}</span>
        <button className="ml-auto underline opacity-70 hover:opacity-100" onClick={leave}>Leave</button>
      </header>
      {error && <div className="bg-red-700 px-3 py-1 text-sm cursor-pointer" onClick={clearError}>{error}</div>}

      {state.room.status === "lobby" || !game ? (
        <div className="flex-1 overflow-y-auto"><Lobby room={state.room} me={me} send={send} /></div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <Table game={game} me={me} hasSelection={selected.size > 0} selected={selected}
              onDraw={() => send({ type: "DRAW" })} onTakeDiscard={() => send({ type: "TAKE_DISCARD" })}
              onExtend={(comboId, cardIds) => act({ type: "EXTEND_COMBINATION", combo_id: comboId, card_ids: cardIds })}
              onDiscardDrop={(id) => act({ type: "DISCARD", card_id: id })} />
            <Sidebar game={game} code={code} me={me} chat={chat} sendChat={sendChat} />
          </div>
          <div className="bg-black/30">
            <div className="flex flex-wrap items-center gap-2 px-3 pt-2 text-sm">
              <button disabled={!myTurn || game.phase !== "play" || selected.size < 3}
                onClick={() => act({ type: "CREATE_COMBINATION", card_ids: ids })}
                className="rounded bg-emerald-600 px-3 py-1 font-semibold disabled:opacity-40 transition-opacity hover:bg-emerald-500">
                Lay down ({selected.size})
              </button>
              <button disabled={!myTurn || game.phase !== "play" || selected.size !== 1}
                onClick={() => act({ type: "DISCARD", card_id: ids[0] })}
                className="rounded bg-rose-600 px-3 py-1 font-semibold disabled:opacity-40 transition-opacity hover:bg-rose-500">
                Discard selected
              </button>
              <button disabled={!myTurn || game.phase !== "play" || game.my_hand.length !== 1}
                onClick={() => act({ type: "PRESS_DOWN" })}
                className="rounded bg-violet-600 px-3 py-1 font-semibold disabled:opacity-40 transition-opacity hover:bg-violet-500">
                Press down
              </button>
              <button disabled={selected.size === 0} onClick={() => setSelected(new Set())}
                className="rounded bg-black/30 px-2 py-1 disabled:opacity-40 transition-opacity hover:bg-black/50">
                Clear
              </button>
              <span className="text-xs opacity-60">Select cards then click a pile to add, or drag onto it. Drag to the discard pile to discard.</span>
            </div>
            <Hand cards={cards} selected={selected} toggle={toggle} move={move} sortBy={sortBy} />
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
