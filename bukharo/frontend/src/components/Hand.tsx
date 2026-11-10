import type { CardT } from "../types";
import { CardFace } from "./Card";

interface Props {
  cards: CardT[]; selected: Set<string>; toggle: (id: string) => void; move: (id: string, before: string | null) => void;
  sortBy: (m: "suit" | "rank") => void;
}

export function Hand({ cards, selected, toggle, move, sortBy }: Props) {
  const dragged = (e: React.DragEvent) => e.dataTransfer.getData("text/plain");
  return (
    <div className="px-3 pb-3 pt-5" style={{ ["--cw" as string]: "clamp(44px, 5.2vw, 78px)" }}>
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-200">
        <span>Your hand ({cards.length})</span>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50" onClick={() => sortBy("suit")}>Sort by suit</button>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50" onClick={() => sortBy("rank")}>Sort by rank</button>
        <span className="opacity-70">Drag to reorder · click to select</span>
      </div>
      <div className="flex min-h-[calc(var(--cw)*1.45+0.75rem)] items-end overflow-x-auto pb-1 pt-4"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = dragged(e); if (id) move(id, null); }}>
        {cards.map((c, i) => (
          <CardFace key={c.id} card={c} selected={selected.has(c.id)} draggable
            style={{ marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.42)", cursor: "grab" }}
            onClick={() => toggle(c.id)}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.stopPropagation(); const id = dragged(e); if (id && id !== c.id) move(id, c.id); }} />
        ))}
      </div>
    </div>
  );
}
