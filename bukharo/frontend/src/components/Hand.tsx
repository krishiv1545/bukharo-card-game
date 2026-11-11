import type { CardT } from "../types";
import { CardFace } from "./Card";

interface Props {
  cards: CardT[]; selected: Set<string>; toggle: (id: string) => void; move: (id: string, before: string | null) => void;
  sortBy: (m: "suit" | "rank") => void;
  autoCenter: boolean; setAutoCenter: (v: boolean) => void;
}

function makeDragImage(e: React.DragEvent): () => void {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ghost = target.cloneNode(true) as HTMLElement;
  ghost.style.cssText = `position:fixed;top:-2000px;left:0;margin:0;transform:none;width:${rect.width}px;pointer-events:none;`;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
  return () => ghost.remove();
}

export function Hand({ cards, selected, toggle, move, sortBy, autoCenter, setAutoCenter }: Props) {
  return (
    <div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-3 sm:pt-4" style={{ ["--cw" as string]: "clamp(46px, 10vw, 78px)" }}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-200">
        <span className="font-medium">Hand ({cards.length})</span>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50 transition-colors active:scale-95 touch-manipulation" onClick={() => sortBy("suit")}>Suit</button>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50 transition-colors active:scale-95 touch-manipulation" onClick={() => sortBy("rank")}>Rank</button>
        <label className="flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 text-slate-200 hover:bg-black/50 transition-colors cursor-pointer">
          <input type="checkbox" checked={autoCenter} onChange={(e) => setAutoCenter(e.target.checked)} className="accent-amber-400" />
          <span>Auto</span>
        </label>
        <span className="hidden sm:inline opacity-60">Drag to reorder · click to select</span>
      </div>
      <div className="flex min-h-[calc(var(--cw)*1.45+0.75rem)] items-end overflow-x-auto pb-1 pt-3 touch-pan-x"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, null); }}>
        {cards.map((c, i) => (
          <CardFace key={c.id} card={c} selected={selected.has(c.id)} draggable
            style={{ marginLeft: i === 0 ? 0 : "calc(var(--cw) * -0.42)", cursor: "grab" }}
            onClick={() => toggle(c.id)}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", c.id);
              const cleanup = makeDragImage(e);
              setTimeout(cleanup, 0);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.stopPropagation(); const id = e.dataTransfer.getData("text/plain"); if (id && id !== c.id) move(id, c.id); }} />
        ))}
      </div>
    </div>
  );
}
