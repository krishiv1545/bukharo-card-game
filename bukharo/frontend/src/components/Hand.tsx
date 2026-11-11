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
    <div className="px-3 pb-3 pt-5" style={{ ["--cw" as string]: "clamp(44px, 5.2vw, 78px)" }}>
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-200">
        <span>Your hand ({cards.length})</span>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50 transition-colors" onClick={() => sortBy("suit")}>Sort by suit</button>
        <button className="rounded bg-black/30 px-2 py-0.5 hover:bg-black/50 transition-colors" onClick={() => sortBy("rank")}>Sort by rank</button>
        <label className="flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 text-slate-200 hover:bg-black/50 transition-colors">
          <input type="checkbox" checked={autoCenter} onChange={(e) => setAutoCenter(e.target.checked)} />
          <span>Auto</span>
        </label>
        <span className="opacity-60">Drag to reorder · click to select</span>
      </div>
      <div className="flex min-h-[calc(var(--cw)*1.45+0.75rem)] items-end overflow-x-auto pb-1 pt-4"
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
