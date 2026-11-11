from __future__ import annotations
from dataclasses import dataclass
from .cards import Card
from .combinations import Combination


@dataclass
class ScoringConfig:
    clean_seven: int = 200
    dirty_seven: int = 100
    seven_aces: int = 500
    dirty_seven_aces: int = 250
    seven_twos: int = 1000
    press_down: int = 200


@dataclass
class ScoreBreakdown:
    laid_points: int = 0     # face value of cards in piles NOT closed
    clean_sevens: int = 0
    dirty_sevens: int = 0
    seven_aces: int = 0      # clean or dirty aces
    seven_twos: int = 0      # seven 2s
    press_downs: int = 0
    hand_penalty: int = 0

    @property
    def total(self) -> int:
        return (self.laid_points + self.clean_sevens + self.dirty_sevens
                + self.seven_aces + self.seven_twos + self.press_downs - self.hand_penalty)


def score_round(combos: list[Combination], hand: list[Card], press_downs: int,
                cfg: ScoringConfig = ScoringConfig()) -> ScoreBreakdown:
    """The final pressed card is never passed in: it counts on neither side.

    A pile closes at exactly 7 cards and scores only its bonus (no face value).
    Any closed pile, sequence or set, is clean or dirty; a closed set of only
    aces and/or 2s gets the Aces bonus (500 clean, 250 if aces are mixed with 2s),
    except a closed sequence/set of seven 2s which scores 1000. Open piles score the face value of their cards.
    """
    b = ScoreBreakdown(press_downs=press_downs * cfg.press_down,
                       hand_penalty=sum(c.value for c in hand))
    for combo in combos:
        lay = combo.layout
        if not lay.closed:
            b.laid_points += sum(c.value for c in combo.cards)
        elif (lay.kind == "set" or lay.kind == "sequence") and all(c.rank == 2 for c in lay.ordered):
            # 2222222 = 1000 (seven 2s)
            b.seven_twos += cfg.seven_twos
        elif lay.kind == "set" and all(c.rank in (1, 2) for c in lay.ordered):
            # AAAAAAA = 500, aces mixed with 2s (e.g. AAA2222) = dirty aces, 250
            b.seven_aces += cfg.dirty_seven_aces if lay.dirty else cfg.seven_aces
        elif lay.dirty:
            b.dirty_sevens += cfg.dirty_seven
        else:
            b.clean_sevens += cfg.clean_seven
    return b
