import type { ComboV, GameV } from "../types";
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

function Opponent({ p, current }: { p: import("../types").PlayerV; current: boolean }) {
  return (
    <div className={`rounded-lg p-2 transition-all ${current ? "bg-amber-400/25 ring-2 ring-amber-400 shadow-amber-400/20 shadow-lg" : "bg-black/20"}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <b>{p.id}</b><span className="opacity-70">{p.hand_count} cards</span>
        {current && <span className="rounded bg-amber-400 px-1.5 text-xs font-bold text-black">TURN</span>}
        <span className={`rounded px-1.5 text-xs ${p.opened ? "bg-emerald-600" : "bg-slate-600"}`}>{p.opened ? "opened" : "not opened"}</span>
        {p.claimed_sets.length > 0 && <span className="rounded bg-sky-700 px-1.5 text-xs">sets: {p.claimed_sets.map((i) => i + 1).join(",")}</span>}
      </div>
      <div className="flex" style={{ ["--cw" as string]: "clamp(22px, 2.6vw, 38px)" }}>
        {Array.from({ length: p.hand_count }, (_, i) => <CardBack key={i} style={{ marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.65)" }} />)}
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
    canExtend ? "cursor-pointer hover:bg-white/15 ring-2 ring-amber-300/70" : "",
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

export function Table({ game, me, hasSelection, selected, onExtend, onDiscardDrop, onTakeDiscard, onDraw }: Props) {
  const myTurn = game.current === me;
  const myTeam = game.players.find((p) => p.id === me)?.team;
  const teams = [...new Set(game.players.map((p) => p.team))];
  const top = game.discard[game.discard.length - 1];
  const canExtend = (c: ComboV) => myTurn && game.phase === "play" && hasSelection && c.team === myTeam && !c.closed;
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="flex flex-wrap gap-2">
        {game.players.filter((p) => p.id !== me).map((p) => <Opponent key={p.id} p={p} current={game.current === p.id} />)}
      </div>

      <div className="flex items-start gap-6" style={{ ["--cw" as string]: "clamp(40px, 4.8vw, 70px)" }}>
        <div className="text-center text-xs">
          <button disabled={!(myTurn && game.phase === "draw")} onClick={onDraw} title="Draw one card"
            className="block disabled:opacity-60 enabled:ring-2 enabled:ring-amber-400 rounded-md transition-all">
            <CardBack />
          </button>
          <div className="mt-1">Draw ({game.draw_count})</div>
        </div>
        <div className="text-center text-xs">
          <div className="flex min-h-[calc(var(--cw)*1.4)] min-w-[var(--cw)] items-center rounded-md border border-dashed border-white/40"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) onDiscardDrop(id); }}>
            {game.discard.slice(-5).map((c, i) => <CardFace key={c.id} card={c} style={{ marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.7)" }} />)}
          </div>
          <div className="mt-1">Discard ({game.discard.length}){!top && " · empty"}</div>
          <button disabled={!(myTurn && game.phase === "draw" && game.discard.length > 0)} onClick={onTakeDiscard}
            className="mt-1 rounded bg-amber-400 px-2 py-0.5 font-semibold text-black disabled:opacity-40 transition-opacity">Take whole pile</button>
        </div>
        <div className="text-sm">
          {game.phase === "over" ? <b>Game over</b> : myTurn
            ? <b className="text-amber-300">Your turn: {game.phase === "draw" ? "draw a card" : "lay down, then discard or press down"}</b>
            : <span>Waiting for <b>{game.current}</b>…</span>}
        </div>
      </div>

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
