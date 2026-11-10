import itertools, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import pytest
from engine.cards import Card, build_decks
from engine.combinations import validate, Combination, InvalidCombination, move_card
from engine.scoring import score_round

_n = itertools.count()
def C(rank, suit="S", deck=1):
    return Card(f"t{next(_n)}", deck, suit, rank)
def seq(suit, *ranks): return [C(r, suit) for r in ranks]

def test_deck_unique_ids():
    d = build_decks(3)
    assert len(d) == 156 and len({c.id for c in d}) == 156

def test_card_values():
    assert [C(r).value for r in (1, 2, 5, 9, 10, 11, 12, 13)] == [10, 10, 5, 9, 10, 10, 10, 10]

def test_clean_sequence_with_natural_two():
    lay = validate(seq("S", 2, 3, 4, 5, 6, 7, 8))
    assert not lay.dirty

def test_dirty_sequence_gap():
    cards = seq("S", 3, 4, 6, 7) + [C(2, "H")]
    lay = validate(cards)
    assert lay.dirty and lay.ordered[2].rank == 2

def test_ace_low_and_high():
    validate(seq("H", 1, 2, 3)); validate(seq("H", 12, 13, 1))
    with pytest.raises(InvalidCombination): validate(seq("H", 13, 1, 3))  # no wrap

def test_mixed_suit_and_gap_rejected():
    with pytest.raises(InvalidCombination): validate([C(4, "S"), C(5, "H"), C(6, "S")])
    with pytest.raises(InvalidCombination): validate(seq("S", 4, 5, 7))

def test_sets():
    validate([C(13, "S"), C(13, "H"), C(13, "D")])
    validate([C(13, "S", 1), C(13, "S", 2), C(13, "D")])      # duplicates across decks ok
    validate([C(13, "S"), C(13, "H"), C(2, "D")])              # K K 2
    with pytest.raises(InvalidCombination): validate([C(13, "S"), C(12, "H"), C(13, "D")])

def test_ultimate_repositions_inside_combination():
    combo = Combination.create("a", "T1", "p1", seq("S", 2, 3, 4, 5, 6, 7))
    assert not combo.layout.dirty                              # natural 2
    # a 9 arrives: no gap-fill possible for natural 2 -> must be rejected,
    wild_case = Combination.create("b", "T1", "p1", seq("S", 3, 4, 5, 6, 7) + [C(2, "H")])
    bigger = wild_case.extend([C(9, "S")])                     # 2 slides to fill the 8
    assert bigger.layout.dirty and len(bigger.layout.ordered) == 7

def test_ultimate_cannot_change_combination():
    a = Combination.create("a", "T", "p", seq("S", 3, 4, 5) + [C(2, "H")])
    b = Combination.create("b", "T", "p", [C(13, "S"), C(13, "H"), C(13, "D")])
    with pytest.raises(InvalidCombination): move_card(next(c for c in a.cards if c.rank == 2), a, b)

def test_scoring_sevens_and_penalty():
    clean = Combination.create("a", "T", "p", seq("S", 4, 5, 6, 7, 8, 9, 10))
    dirty = Combination.create("b", "T", "p", seq("H", 3, 4, 5, 6, 7, 8) + [C(2, "D")])
    hand = [C(1), C(2, "H"), C(13, "D"), C(8, "C"), C(5)]
    b = score_round([clean, dirty], hand, press_downs=1)
    assert b.hand_penalty == 43 and b.clean_sevens == 200 and b.dirty_sevens == 100 and b.press_downs == 200
    assert b.laid_points == 0   # closed piles score only their bonus

def test_seven_aces():
    clean = Combination.create("a", "T", "p", [C(1, s, d) for s in "SHDC" for d in (1,)] + [C(1, "S", 2)] * 0 + [C(1, "H", 2), C(1, "D", 2), C(1, "C", 2)])
    assert score_round([clean], [], 0).seven_aces == 500
    dirty = Combination.create("b", "T", "p", [C(1, "S", 1), C(1, "H", 1), C(1, "D", 1), C(1, "C", 1), C(1, "S", 2), C(1, "H", 2), C(2, "D")])
    assert score_round([dirty], [], 0).seven_aces == 250

def test_multiple_ultimates():
    validate(seq("S", 5, 8) + [C(2, "H"), C(2, "D")])           # 5 _ _ 8 with two wilds
    validate([C(13, "S"), C(2, "H"), C(2, "D")])                # K 2 2 as a set
    lay = validate(seq("S", 2, 3, 4) + [C(2, "H")])             # natural 2 plus a wild... 
    assert lay.dirty and len(lay.wilds) == 1

def test_pile_closes_at_seven():
    kings = [C(13, s, d) for s in "SHD" for d in (1, 2)] + [C(13, "C")]
    closed = Combination.create("k", "T", "p", kings)           # seven kings
    assert closed.layout.closed
    with pytest.raises(InvalidCombination): closed.extend([C(13, "C", 2)])
    with pytest.raises(InvalidCombination): validate(seq("S", 3, 4, 5, 6, 7, 8, 9, 10))
    assert score_round([closed], [], 0).clean_sevens == 200

def test_open_pile_scores_face_value():
    open_ = Combination.create("o", "T", "p", seq("S", 4, 5, 6, 7))
    assert score_round([open_], [], 0).laid_points == 22

def test_seven_aces_variants():
    aces7 = [C(1, s, d) for s in "SHDC" for d in (1,)] + [C(1, "S", 2), C(1, "H", 2), C(1, "D", 2)]
    assert score_round([Combination.create("a", "T", "p", aces7)], [], 0).seven_aces == 500
    mixed = [C(1, "S"), C(1, "H"), C(1, "D")] + [C(2, s) for s in "SHDC"]            # AAA2222
    assert score_round([Combination.create("b", "T", "p", mixed)], [], 0).seven_aces == 250
    twos = [C(2, s, d) for s in "SHD" for d in (1, 2)] + [C(2, "C")]                 # 2222222
    b = score_round([Combination.create("c", "T", "p", twos)], [], 0)
    assert b.seven_aces == 500 and b.clean_sevens == 0
