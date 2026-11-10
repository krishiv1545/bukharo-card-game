import { useEffect, useMemo, useState } from "react";
import { Hand } from "./components/Hand";
import { Lobby } from "./components/Lobby";
import { Sidebar } from "./components/Sidebar";
import { Table } from "./components/Table";
import { useHandOrder } from "./useHandOrder";
import { useRoom } from "./useRoom";
import type { CardT } from "./types";

const NO_CARDS: CardT[] = [];

export default function RoomView({ code, me, leave }: { code: string; me: string; leave: () => void }) {
  const { state, error, online, denied, send, clearError } = useRoom(code);
  const game = state?.game ?? null;
  const { cards, move, sortBy } = useHandOrder(`bukharo:${code}:${me}`, game?.my_hand ?? NO_CARDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {   // drop selections of cards that left the hand
    const ids = new Set(cards.map((c) => c.id));
    setSelected((s) => (s.size && [...s].some((i) => !ids.has(i)) ? new Set([...s].filter((i) => ids.has(i))) : s));
  }, [cards]);
  useEffect(() => { if (error) { const t = setTimeout(clearError, 4000); return () => clearTimeout(t); } }, [error, clearError]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  const myTurn = !!game && game.current === me;
  const act = (a: object) => { send(a); setSelected(new Set()); };
  const ids = useMemo(() => [...selected], [selected]);

  if (denied) return <div className="p-8">You're not in this room. <button className="underline" onClick={leave}>Back</button></div>;
  if (!state) return <div className="p-8">Connecting…</div>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 bg-black/30 px-3 py-1 text-xs">
        <b>Bukharo</b><span>{me}</span>
        <span className={online ? "text-emerald-300" : "text-red-300"}>{online ? "connected" : "reconnecting…"}</span>
        <button className="ml-auto underline" onClick={leave}>Leave view</button>
      </header>
      {error && <div className="bg-red-700 px-3 py-1 text-sm" onClick={clearError}>{error}</div>}
      {state.room.status === "lobby" || !game ? (
        <div className="flex-1 overflow-y-auto"><Lobby room={state.room} me={me} send={send} /></div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <Table game={game} me={me} hasSelection={selected.size > 0} selected={selected}
              onDraw={() => send({ type: "DRAW" })} onTakeDiscard={() => send({ type: "TAKE_DISCARD" })}
              onExtend={(comboId, cardIds) => act({ type: "EXTEND_COMBINATION", combo_id: comboId, card_ids: cardIds })}
              onDiscardDrop={(id) => act({ type: "DISCARD", card_id: id })} />
            <Sidebar game={game} code={code} />
          </div>
          <div className="bg-black/30">
            <div className="flex flex-wrap items-center gap-2 px-3 pt-2 text-sm">
              <button disabled={!myTurn || game.phase !== "play" || selected.size < 3}
                onClick={() => act({ type: "CREATE_COMBINATION", card_ids: ids })}
                className="rounded bg-emerald-600 px-3 py-1 font-semibold disabled:opacity-40">Lay down selected ({selected.size})</button>
              <button disabled={!myTurn || game.phase !== "play" || selected.size !== 1}
                onClick={() => act({ type: "DISCARD", card_id: ids[0] })}
                className="rounded bg-rose-600 px-3 py-1 font-semibold disabled:opacity-40">Discard selected</button>
              <button disabled={!myTurn || game.phase !== "play" || game.my_hand.length !== 1}
                onClick={() => act({ type: "PRESS_DOWN" })}
                className="rounded bg-violet-600 px-3 py-1 font-semibold disabled:opacity-40">Press down</button>
              <button disabled={selected.size === 0} onClick={() => setSelected(new Set())} className="rounded bg-black/30 px-2 py-1 disabled:opacity-40">Clear</button>
              <span className="text-xs opacity-70">To add to a pile: select cards, then click the pile (or drag cards onto it). Drag a card onto the discard pile to discard.</span>
            </div>
            <Hand cards={cards} selected={selected} toggle={toggle} move={move} sortBy={sortBy} />
          </div>
        </>
      )}
    </div>
  );
}
