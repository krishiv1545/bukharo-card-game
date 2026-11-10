import type { Breakdown, GameV } from "../types";

const COLS: [keyof Breakdown, string][] = [
  ["laid_points", "Laid"], ["clean_sevens", "Clean 7"], ["dirty_sevens", "Dirty 7"], ["seven_aces", "Aces"],
  ["press_downs", "Press"], ["hand_penalty", "Hand −"], ["total", "Total"],
];

export function Sidebar({ game, code }: { game: GameV; code: string }) {
  return (
    <aside className="w-64 shrink-0 space-y-4 overflow-y-auto bg-black/25 p-3 text-sm">
      <div className="text-xs opacity-70">Room <b className="tracking-widest">{code}</b></div>
      <section>
        <h3 className="mb-1 font-semibold">Bukharo sets</h3>
        <ul className="space-y-1">
          {game.sets.map((s, i) => (
            <li key={s.index} className="flex justify-between rounded bg-black/20 px-2 py-1">
              <span>{i === game.sets.length - 1 && game.sets.length > 1 ? "Bukharo" : `Set ${s.index + 1}`}</span>
              <span className={s.status === "available" ? "text-emerald-300" : "text-slate-300"}>
                {s.status === "available" ? "available" : `claimed · ${s.claimed_by}`}
              </span>
            </li>
          ))}
        </ul>
        {game.sets.every((s) => s.status === "claimed") && game.phase !== "over" &&
          <p className="mt-1 text-xs text-amber-300">All sets claimed — the next press-down ends the round.</p>}
      </section>
      <section>
        <h3 className="mb-1 font-semibold">Scoreboard</h3>
        {game.result ? (
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(game.result).map(([team, b]) => (
                <tr key={team} className="border-t border-white/10 align-top">
                  <td className="py-1 pr-2 font-semibold">{team}</td>
                  <td>{COLS.map(([k, l]) => <div key={k} className="flex justify-between gap-2"><span className="opacity-70">{l}</span>
                    <span className={k === "total" ? "font-bold" : ""}>{b[k]}</span></div>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs opacity-70">Scores are calculated when the round ends.</p>}
      </section>
      <section>
        <h3 className="mb-1 font-semibold">Players</h3>
        <ul className="space-y-1 text-xs">
          {game.players.map((p) => <li key={p.id} className="flex justify-between"><span>{p.id}</span><span className="opacity-70">{p.presses} press-down{p.presses === 1 ? "" : "s"}</span></li>)}
        </ul>
      </section>
    </aside>
  );
}
