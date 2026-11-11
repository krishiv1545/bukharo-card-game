import { useEffect, useRef, useState } from "react";
import type { Breakdown, ChatMsg, GameV } from "../types";

const COLS: [keyof Breakdown, string][] = [
  ["laid_points", "Laid"], ["clean_sevens", "Clean 7"], ["dirty_sevens", "Dirty 7"], ["seven_aces", "Aces"], ["seven_twos", "Seven 2s"],
  ["press_downs", "Press"], ["hand_penalty", "Hand -"], ["total", "Total"],
];

interface Props {
  game: GameV;
  code: string;
  me: string;
  chat: ChatMsg[];
  sendChat: (text: string) => void;
  className?: string;
  onClose?: () => void;
}

function ChatPanel({ me, chat, sendChat }: { me: string; chat: ChatMsg[]; sendChat: (t: string) => void }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim()) { sendChat(draft.trim()); setDraft(""); }
  };

  return (
    <section className="flex flex-col gap-1">
      <h3 className="font-semibold">Chat</h3>
      <ul ref={listRef} className="h-36 overflow-y-auto rounded bg-black/20 p-2 space-y-1 text-xs">
        {chat.length === 0 && <li className="opacity-40 italic">No messages yet.</li>}
        {chat.map((m, i) => (
          <li key={i} className={`flex gap-1 ${m.from === me ? "text-amber-200" : "text-slate-200"}`}>
            <span className="font-semibold shrink-0">{m.from}:</span>
            <span className="break-all">{m.text}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-1">
        <input
          className="flex-1 rounded bg-black/30 px-2 py-1 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
          placeholder="Say something…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
        />
        <button type="submit" disabled={!draft.trim()}
          className="rounded bg-amber-400 px-2 py-1 text-xs font-semibold text-black disabled:opacity-40 transition-opacity active:scale-95 touch-manipulation">
          Send
        </button>
      </form>
    </section>
  );
}

export function Sidebar({ game, code, me, chat, sendChat, className, onClose }: Props) {
  const myTeam = game.players.find(p => p.id === me)?.team;
  const availableCount = game.sets.filter(s => s.status === "available").length;
  const allClaimed = game.sets.length > 0 && availableCount === 0;

  return (
    <aside className={`flex flex-col gap-4 overflow-y-auto p-3 text-sm ${className ?? "w-64 shrink-0 bg-black/25"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-70">Room <b className="tracking-widest">{code}</b></div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bukharo sets */}
      <section>
        <h3 className="mb-1 font-semibold flex items-center gap-2">
          Bukharo sets
          {availableCount > 0 && (
            <span className="animate-pulse rounded bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
              {availableCount} open
            </span>
          )}
        </h3>
        <ul className="space-y-1">
          {game.sets.map((s) => (
            <li key={s.index}
              className={`flex justify-between rounded px-2 py-1 text-xs font-medium ${
                s.status === "available"
                  ? "bg-emerald-600/80 text-white ring-1 ring-emerald-400"
                  : "bg-slate-700/60 text-slate-300"
              }`}>
              <span>Bukharo {s.index + 1}</span>
              <span>{s.status === "available" ? "available" : `claimed · ${s.claimed_by}`}</span>
            </li>
          ))}
        </ul>
        {allClaimed && game.phase !== "over" &&
          <p className="mt-1 text-xs text-amber-300">All sets claimed. The next press-down ends the round.</p>}
      </section>

      {/* Scoreboard */}
      <section>
        <h3 className="mb-1 font-semibold">Scoreboard</h3>
        {game.result ? (
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(game.result).map(([team, b]) => (
                <tr key={team} className="border-t border-white/10 align-top">
                  <td className={`py-1 pr-2 font-semibold ${team === myTeam ? "text-amber-300" : ""}`}>{team}</td>
                  <td>
                    {COLS.map(([k, l]) => (
                      <div key={k}
                        className={`flex justify-between gap-2 ${
                          k === "total"
                            ? "mt-1 rounded bg-amber-400/20 px-1.5 py-0.5 font-bold text-amber-200 ring-1 ring-amber-400/40"
                            : ""
                        }`}>
                        <span className={k === "total" ? "" : "opacity-70"}>{l}</span>
                        <span>{b[k]}</span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs opacity-70">Scores are shown when the round ends.</p>}
      </section>

      {/* Players */}
      <section>
        <h3 className="mb-1 font-semibold">Players</h3>
        <ul className="space-y-1 text-xs">
          {game.players.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span className={p.id === me ? "font-semibold text-amber-200" : ""}>{p.id}{p.id === me ? " (you)" : ""}</span>
              <span className="opacity-70">{p.presses} press{p.presses === 1 ? "" : "es"}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Chat */}
      <ChatPanel me={me} chat={chat} sendChat={sendChat} />
    </aside>
  );
}
