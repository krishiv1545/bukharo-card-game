import type { CSSProperties, DragEventHandler } from "react";
import type { CardT, Suit } from "../types";

export const SYM: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const label = (r: number) => (r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r));

interface FaceProps {
  card: CardT; selected?: boolean; wild?: boolean; style?: CSSProperties; draggable?: boolean;
  onClick?: () => void; onDragStart?: DragEventHandler; onDragOver?: DragEventHandler; onDrop?: DragEventHandler;
}

export function CardFace({ card, selected, wild, style, ...rest }: FaceProps) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div {...rest} style={{ width: "var(--cw)", ...style }}
      className={`relative aspect-[5/7] shrink-0 select-none rounded-md border border-slate-400 bg-white shadow-md transition-transform ${red ? "text-red-600" : "text-slate-900"} ${selected ? "-translate-y-3 ring-2 ring-amber-400" : ""}`}>
      <div className="absolute left-[8%] top-[4%] font-semibold leading-none" style={{ fontSize: "calc(var(--cw) * 0.27)" }}>
        {label(card.rank)}<br />{SYM[card.suit]}
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-80" style={{ fontSize: "calc(var(--cw) * 0.5)" }}>{SYM[card.suit]}</div>
      {wild && <span className="absolute bottom-[4%] right-[6%] rounded bg-amber-400 px-1 font-bold text-black" style={{ fontSize: "calc(var(--cw) * 0.2)" }} title="Ultimate (wild)">U</span>}
    </div>
  );
}

export function CardBack({ style }: { style?: CSSProperties }) {
  return <div
    className="aspect-[5/7] shrink-0 rounded-md border border-slate-300 shadow-md"
    style={{
      width: "var(--cw)",
      background: "repeating-linear-gradient(45deg, var(--back1), var(--back1) 4px, var(--back2) 4px, var(--back2) 8px)",
      ...style,
    }}
  />;
}
