"""GameState <-> plain JSON, so a game survives a server restart. No Django imports.
The event log is not stored here: the server persists it as GameEvent rows."""
from __future__ import annotations
from dataclasses import asdict
from .cards import Card
from .combinations import Combination
from .scoring import ScoreBreakdown, ScoringConfig
from .state import GameConfig, GameState, PlayerState, ExtraSet

_c = lambda c: [c.id, c.deck, c.suit, c.rank]
_cs = lambda cs: [_c(c) for c in cs]
_load = lambda ls: [Card(*l) for l in ls]


def dump(st: GameState) -> dict:
    return {
        "config": asdict(st.config),
        "players": [{"id": p.id, "team": p.team, "hand": _cs(p.hand), "opened": p.opened,
                     "pressed": _cs(p.pressed), "claimed_sets": p.claimed_sets} for p in st.players],
        "draw_pile": _cs(st.draw_pile), "discard_pile": _cs(st.discard_pile),
        "sets": [{"index": s.index, "cards": _cs(s.cards), "claimed_by": s.claimed_by} for s in st.sets],
        "combos": [{"id": c.id, "team": c.team, "creator": c.creator, "cards": _cs(c.cards)}
                   for c in st.combos.values()],
        "current": st.current, "phase": st.phase, "combo_seq": st.combo_seq,
        "deck_count": st.deck_count,
        "result": None if st.result is None else {t: asdict(b) for t, b in st.result.items()},
    }


def load(d: dict) -> GameState:
    cfg = dict(d["config"])
    cfg["scoring"] = ScoringConfig(**cfg["scoring"])
    return GameState(
        config=GameConfig(**cfg),
        players=[PlayerState(p["id"], p["team"], _load(p["hand"]), p["opened"],
                             _load(p["pressed"]), p["claimed_sets"]) for p in d["players"]],
        draw_pile=_load(d["draw_pile"]), discard_pile=_load(d["discard_pile"]),
        sets=[ExtraSet(s["index"], _load(s["cards"]), s["claimed_by"]) for s in d["sets"]],
        combos={c["id"]: Combination(c["id"], c["team"], c["creator"], frozenset(_load(c["cards"])))
                for c in d["combos"]},
        current=d["current"], phase=d["phase"], combo_seq=d["combo_seq"],
        deck_count=d["deck_count"],
        result=None if d["result"] is None else
        {t: ScoreBreakdown(**b) for t, b in d["result"].items()})
