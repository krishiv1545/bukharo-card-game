import { useState } from "react";
import type { RoomV } from "../types";

interface Props { room: RoomV; me: string; send: (a: object) => void }

const FIELDS: [string, string][] = [["decks", "Decks (blank = players+1)"], ["extra_sets", "Bukharo sets (blank = players+1)"], ["opening_len", "Opening sequence length"]];
const SCORING: [string, string][] = [["clean_seven", "Clean 7"], ["dirty_seven", "Dirty 7"], ["seven_aces", "Seven Aces"], ["dirty_seven_aces", "Dirty Aces"], ["press_down", "Press-down"]];

export function Lobby({ room, me, send }: Props) {
  const isHost = room.host === me;
  const mine = room.members.find((m) => m.username === me);
  const cfg = room.config as Record<string, unknown>;
  const sc = (cfg.scoring ?? {}) as Record<string, number>;
  const [form, setForm] = useState<Record<string, string>>({
    ...Object.fromEntries(FIELDS.map(([k]) => [k, cfg[k] === undefined ? "" : String(cfg[k])])),
    ...Object.fromEntries(SCORING.map(([k]) => [k, sc[k] === undefined ? "" : String(sc[k])])),
    refill: cfg.refill_deck_when_empty === false ? "off" : "on",
  });
  const apply = () => {
    const config: Record<string, unknown> = { refill_deck_when_empty: form.refill !== "off" };
    for (const [k] of FIELDS) if (form[k].trim() !== "") config[k] = Number(form[k]);
    const scoring: Record<string, number> = {};
    for (const [k] of SCORING) if (form[k].trim() !== "") scoring[k] = Number(form[k]);
    if (Object.keys(scoring).length) config.scoring = scoring;
    send({ type: "SET_CONFIG", config });
  };
  const input = "w-24 rounded bg-black/30 px-2 py-1 text-right";
  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5 p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold">Lobby · room <span className="tracking-widest text-amber-300">{room.code}</span></h2>
      <p className="text-xs sm:text-sm opacity-80">Share the code (or this page's link) with your friends.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm min-w-[280px]">
          <thead><tr className="text-left opacity-70"><th>Player</th><th>Team (blank = solo)</th><th>Ready</th></tr></thead>
          <tbody>
            {room.members.map((m) => (
              <tr key={m.username} className="border-t border-white/10">
                <td className="py-1">{m.username}{m.username === room.host ? " ★ host" : ""}</td>
                <td>{isHost
                  ? <input defaultValue={m.team} className="w-24 sm:w-28 rounded bg-black/30 px-2 py-0.5 text-xs sm:text-sm" maxLength={32}
                      onBlur={(e) => e.target.value !== m.team && send({ type: "SET_TEAM", user: m.username, team: e.target.value })} />
                  : m.team || "—"}</td>
                <td>{m.ready ? "✅" : "…"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs opacity-70">Seating follows join order. For team play, give teammates the same team name.</p>
      <button onClick={() => send({ type: "READY", ready: !mine?.ready })}
        className={`rounded px-4 py-2 font-semibold ${mine?.ready ? "bg-slate-600" : "bg-emerald-600"}`}>{mine?.ready ? "Not ready" : "I'm ready"}</button>

      <fieldset className="rounded-lg bg-black/20 p-3" disabled={!isHost}>
        <legend className="px-1 text-sm font-semibold">Game settings {isHost ? "" : "(host only)"}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FIELDS.map(([k, l]) => <label key={k} className="flex items-center justify-between gap-2 text-sm">{l}
            <input className={input} inputMode="numeric" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}
          {SCORING.map(([k, l]) => <label key={k} className="flex items-center justify-between gap-2 text-sm">{l} points
            <input className={input} inputMode="numeric" placeholder="default" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}
          <label className="flex items-center justify-between gap-2 text-sm">Add a deck when the draw pile runs out
            <select className={input} value={form.refill} onChange={(e) => setForm({ ...form, refill: e.target.value })}><option value="on">on</option><option value="off">off</option></select></label>
        </div>
        {isHost && <button onClick={apply} className="mt-3 rounded bg-sky-700 px-3 py-1 text-sm">Apply settings</button>}
      </fieldset>
      {isHost && <button onClick={() => send({ type: "START" })} className="rounded bg-amber-400 px-5 py-2 font-bold text-black">Start game</button>}
    </div>
  );
}
