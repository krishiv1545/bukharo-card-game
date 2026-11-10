"""Sequence / set validation with the Ultimate (2) as a wild.

A Combination is an immutable *set of physical cards*. Its display order is
derived by validation, so "repositioning the Ultimate" is automatic: adding a
card re-validates the whole card set and the 2 lands wherever it now fits.
The 2 can never leave its combination (see move_card).
"""
from __future__ import annotations
from dataclasses import dataclass
from .cards import Card, ULTIMATE


class InvalidCombination(ValueError):
    pass


CLOSE_AT = 7  # a pile closes at exactly 7 cards; nothing more can be added


@dataclass(frozen=True)
class Layout:
    kind: str                       # "sequence" | "set"
    ordered: tuple[Card, ...]
    wilds: tuple[Card, ...]         # 2s acting as wilds (any number)

    @property
    def dirty(self) -> bool:
        return bool(self.wilds)

    @property
    def closed(self) -> bool:
        return len(self.ordered) == CLOSE_AT


def _layout_sequence(cards: list[Card]) -> Layout | None:
    n = len(cards)
    twos = [c for c in cards if c.rank == ULTIMATE]
    others = [c for c in cards if c.rank != ULTIMATE]
    if not others or len({c.suit for c in others}) != 1:
        return None
    suit = others[0].suit
    best: Layout | None = None
    for ace_high in (False, True):
        lo_b, hi_b = (2, 14) if ace_high else (1, 13)   # no wrap-around
        pos: dict[int, Card] = {}
        for c in others:
            p = (14 if ace_high else 1) if c.rank == 1 else c.rank
            if p in pos:
                break
            pos[p] = c
        else:
            for s in range(lo_b, hi_b - n + 2):
                window = range(s, s + n)
                if any(p not in window for p in pos):
                    continue
                empty = [p for p in window if p not in pos]
                if len(empty) != len(twos):
                    continue
                # a same-suit 2 sitting in the 2 slot is natural, not wild
                natural = None
                if 2 in empty:
                    natural = next((t for t in twos if t.suit == suit), None)
                wilds = [t for t in twos if t is not natural]
                slots = [p for p in empty if not (natural and p == 2)]
                layout = dict(pos)
                if natural:
                    layout[2] = natural
                layout.update(zip(slots, wilds))
                cand = Layout("sequence", tuple(layout[p] for p in window), tuple(wilds))
                if best is None or len(cand.wilds) < len(best.wilds):
                    best = cand
    return best


def _layout_set(cards: list[Card]) -> Layout | None:
    twos = [c for c in cards if c.rank == ULTIMATE]
    others = [c for c in cards if c.rank != ULTIMATE]
    if not others:                                   # a set of 2s: all natural
        return Layout("set", tuple(cards), ())
    if len({c.rank for c in others}) == 1:           # any number of Ultimates
        return Layout("set", tuple(others + twos), tuple(twos))
    return None


def validate(cards: list[Card], min_len: int = 3) -> Layout:
    """Return a Layout for a legal sequence or set, else raise."""
    if len(cards) < min_len:
        raise InvalidCombination(f"need at least {min_len} cards")
    if len(cards) > CLOSE_AT:
        raise InvalidCombination(f"a pile closes at {CLOSE_AT} cards")
    if len({c.id for c in cards}) != len(cards):
        raise InvalidCombination("duplicate physical card")
    lay = _layout_sequence(cards) or _layout_set(cards)
    if lay is None:
        raise InvalidCombination("not a sequence or a set")
    return lay


@dataclass(frozen=True)
class Combination:
    id: str
    team: str
    creator: str
    cards: frozenset[Card]

    @property
    def layout(self) -> Layout:
        return validate(list(self.cards))

    @staticmethod
    def create(id: str, team: str, creator: str, cards: list[Card], min_len: int = 3) -> "Combination":
        validate(cards, min_len)
        return Combination(id, team, creator, frozenset(cards))

    def extend(self, new_cards: list[Card]) -> "Combination":
        """Add cards; the whole group is re-validated (Ultimate repositions itself)."""
        merged = list(self.cards) + list(new_cards)
        validate(merged)
        return Combination(self.id, self.team, self.creator, frozenset(merged))


def move_card(card: Card, source: Combination, target: Combination) -> None:
    """Cards never move between combinations; the Ultimate certainly doesn't."""
    raise InvalidCombination("cards cannot move between combinations")
