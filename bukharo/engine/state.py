"""Game state, setup, and the privacy-safe public view. No Django imports."""
from __future__ import annotations
import random
from dataclasses import dataclass, field, replace
from .cards import Card, build_decks, shuffled
from .combinations import Combination
from .scoring import ScoringConfig, ScoreBreakdown


class GameError(Exception):
    """A rejected action. The server turns this into an error message to the client."""


@dataclass
class GameConfig:
    decks: int | None = None          # None = auto: one more deck than players
    extra_sets: int | None = None     # Bhukaro sets; None = players + 1 (2p->3, 3p->4, 4p->5)
    opening_len: int = 4
    hand_size: int = 13
    refill_deck_when_empty: bool = True   # add a fresh shuffled deck instead of ending the round
    scoring: ScoringConfig = field(default_factory=ScoringConfig)

    def resolve(self, n_players: int) -> "GameConfig":
        """Fill in defaults for this table size; the result has concrete numbers."""
        sets = self.extra_sets if self.extra_sets is not None else n_players + 1
        dealt = self.hand_size * (n_players + sets) + 1       # hands + sets + opened card
        decks = self.decks if self.decks is not None else n_players + 1
        if not 2 <= decks <= 8:
            raise GameError("decks must be 2-8")
        if 52 * decks < dealt + 1:
            raise GameError(f"{decks} decks cannot cover {n_players} players + {sets} sets")
        return replace(self, decks=decks, extra_sets=sets)


@dataclass
class PlayerState:
    id: str
    team: str
    hand: list[Card] = field(default_factory=list)
    opened: bool = False
    pressed: list[Card] = field(default_factory=list)   # face-down pressed cards (never scored)
    claimed_sets: list[int] = field(default_factory=list)


@dataclass
class ExtraSet:
    index: int
    cards: list[Card]               # emptied once claimed (they become the claimer's hand)
    claimed_by: str | None = None


@dataclass
class GameState:
    config: GameConfig
    players: list[PlayerState]
    draw_pile: list[Card]
    discard_pile: list[Card]        # entire pile is face-up; last item is the top
    sets: list[ExtraSet]
    combos: dict[str, Combination] = field(default_factory=dict)
    current: int = 0
    phase: str = "draw"             # "draw" -> "play" -> (discard) -> next player's "draw"; "over"
    log: list[dict] = field(default_factory=list)   # GameEvent history
    result: dict[str, ScoreBreakdown] | None = None  # team -> breakdown, once over
    combo_seq: int = 0
    deck_count: int = 2             # highest deck number in play (for refill ids)

    def player(self, pid: str) -> PlayerState:
        return next(p for p in self.players if p.id == pid)


def new_game(player_ids: list[str], config: GameConfig | None = None,
             teams: dict[str, str] | None = None, rng: random.Random | None = None) -> GameState:
    if len(player_ids) < 2 or len(set(player_ids)) != len(player_ids):
        raise GameError("need at least 2 distinct players")
    cfg = (config or GameConfig()).resolve(len(player_ids))
    rng = rng or random.SystemRandom()
    deck = shuffled(build_decks(cfg.decks), rng)
    teams = teams or {pid: pid for pid in player_ids}   # default: everyone solo
    if set(teams) != set(player_ids):
        raise GameError("every player needs a team")
    players = [PlayerState(pid, teams[pid]) for pid in player_ids]
    for p in players:
        p.hand = [deck.pop() for _ in range(cfg.hand_size)]
    sets = [ExtraSet(i, [deck.pop() for _ in range(cfg.hand_size)]) for i in range(cfg.extra_sets)]
    discard = [deck.pop()]                              # the random opened card
    st = GameState(cfg, players, deck, discard, sets, current=rng.randrange(len(players)),
                   deck_count=cfg.decks)
    st.log.append({"event": "GAME_STARTED", "first": players[st.current].id})
    return st


def _card(c: Card) -> dict:
    return {"id": c.id, "rank": c.rank, "suit": c.suit, "deck": c.deck}


def public_view(st: GameState, viewer: str) -> dict:
    """What one client may see. Other players' hands never leave the server."""
    combos = []
    for c in st.combos.values():
        lay = c.layout
        combos.append({"id": c.id, "team": c.team, "creator": c.creator, "kind": lay.kind,
                       "cards": [_card(x) for x in lay.ordered],
                       "wild_ids": [w.id for w in lay.wilds], "closed": lay.closed})
    return {
        "phase": st.phase, "current": st.players[st.current].id,
        "players": [{"id": p.id, "team": p.team, "hand_count": len(p.hand),
                     "opened": p.opened, "claimed_sets": p.claimed_sets,
                     "presses": len(p.pressed)} for p in st.players],
        "my_hand": [_card(c) for c in st.player(viewer).hand],
        "draw_count": len(st.draw_pile),
        "discard": [_card(c) for c in st.discard_pile],
        "sets": [{"index": s.index, "status": "claimed" if s.claimed_by else "available",
                  "claimed_by": s.claimed_by} for s in st.sets],
        "combos": combos,
        "result": None if st.result is None else
        {t: vars(b) | {"total": b.total} for t, b in st.result.items()},
    }
