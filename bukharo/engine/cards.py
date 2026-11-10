"""Cards and decks. No Django imports."""
from __future__ import annotations
import random
from dataclasses import dataclass

SUITS = ("S", "H", "D", "C")
ULTIMATE = 2  # rank 2 is the wild "Ultimate"


@dataclass(frozen=True)
class Card:
    id: str      # unique per physical card, e.g. "d1-S-12"
    deck: int
    suit: str
    rank: int    # 1=Ace ... 13=King

    @property
    def value(self) -> int:
        """Hand-penalty value: A, 2, 10, J, Q, K = 10; 3-9 face value."""
        return 10 if self.rank in (1, 2) or self.rank >= 10 else self.rank

    def __repr__(self) -> str:
        r = {1: "A", 11: "J", 12: "Q", 13: "K"}.get(self.rank, str(self.rank))
        return f"{r}{self.suit}#{self.deck}"


def build_deck(deck_no: int) -> list[Card]:
    """One 52-card deck; deck_no keeps every physical card's id unique."""
    return [Card(f"d{deck_no}-{s}-{r}", deck_no, s, r) for s in SUITS for r in range(1, 14)]


def build_decks(n_decks: int = 2) -> list[Card]:
    if not 2 <= n_decks <= 8:
        raise ValueError("decks must be 2-8")
    return [c for d in range(1, n_decks + 1) for c in build_deck(d)]


def shuffled(cards: list[Card], rng: random.Random | None = None) -> list[Card]:
    cards = list(cards)
    (rng or random.SystemRandom()).shuffle(cards)
    return cards
