import itertools, random, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import pytest
from engine.cards import Card
from engine.state import new_game, GameConfig, GameError, public_view
from engine import turns

_n = itertools.count()
def C(rank, suit="S"): return Card(f"x{next(_n)}", 1, suit, rank)
def ids(cs): return [c.id for c in cs]

def game(**kw):
    st = new_game(["a", "b"], GameConfig(**kw), rng=random.Random(7))
    st.current, st.phase = 0, "play"
    return st

def test_setup_conserves_cards():
    st = new_game(["a", "b", "c"], GameConfig(decks=2, extra_sets=1), rng=random.Random(1))
    total = sum(len(p.hand) for p in st.players) + 13 + len(st.draw_pile) + len(st.discard_pile)
    assert total == 104 and len(st.discard_pile) == 1 and all(len(p.hand) == 13 for p in st.players)
    assert len({c.id for p in st.players for c in p.hand}) == 39

def test_turn_order_and_discard():
    st = new_game(["a", "b"], rng=random.Random(3))
    first = st.players[st.current].id
    other = "b" if first == "a" else "a"
    with pytest.raises(GameError): turns.draw(st, other)
    turns.draw(st, first)
    with pytest.raises(GameError): turns.draw(st, first)          # already drew
    turns.discard(st, first, st.player(first).hand[0].id)
    assert st.players[st.current].id == other and st.phase == "draw"

def test_take_whole_discard_pile():
    st = game(); st.phase = "draw"
    st.discard_pile = [C(5), C(6), C(7)]
    turns.take_discard(st, "a")
    assert len(st.discard_pile) == 0 and len(st.player("a").hand) == 13 + 3

def test_opening_rules():
    st = game(); p = st.player("a")
    seq4, dirty4, k3 = [C(r) for r in (4, 5, 6, 7)], [C(3), C(4), C(6), C(2, "H")], [C(13, s) for s in "SHD"]
    p.hand = seq4 + dirty4 + k3 + [C(9, "D")] * 0 + [C(9, "D"), C(8, "C")]
    for bad in (dirty4, k3, seq4[:3]):                            # dirty / set / 3-card sequence
        with pytest.raises(GameError): turns.create_combination(st, "a", ids(bad))
    assert not p.opened and len(p.hand) == 4 + 4 + 3 + 2          # failed actions changed nothing
    turns.create_combination(st, "a", ids(seq4))
    assert p.opened
    turns.create_combination(st, "a", ids(k3))                    # now a 3-card set is fine
    turns.create_combination(st, "a", ids(dirty4[:3]) + [dirty4[3].id])  # and dirty piles

def test_cannot_lay_last_card_and_must_press():
    st = game(); p = st.player("a")
    seq4 = [C(r) for r in (4, 5, 6, 7)]
    p.hand = seq4
    with pytest.raises(GameError): turns.create_combination(st, "a", ids(seq4))
    p.hand = seq4 + [C(9, "H")]
    turns.create_combination(st, "a", ids(seq4))
    with pytest.raises(GameError): turns.discard(st, "a", p.hand[0].id)

def test_press_down_claims_set_then_final_press_ends_game():
    st = game(extra_sets=1); p = st.player("a")
    seq4 = [C(r) for r in (4, 5, 6, 7)]
    p.hand = seq4 + [C(9, "H")]
    turns.create_combination(st, "a", ids(seq4))
    turns.press_down(st, "a")
    assert len(p.hand) == 13 and st.sets[0].claimed_by == "a" and st.phase == "play"
    # new hand: set up a final press with the set already claimed
    p.hand = [C(13, "D")]
    st.player("b").hand = [C(5, "S"), C(1, "S")]
    turns.press_down(st, "a")
    assert st.phase == "over"
    a, b = st.result["a"], st.result["b"]
    assert a.laid_points == 22 and a.press_downs == 400 and a.hand_penalty == 0 and a.total == 422
    assert b.hand_penalty == 15 and b.total == -15

def test_extend_own_team_only_and_ultimate_stays():
    st = game(); p = st.player("a")
    seq4 = [C(r) for r in (4, 5, 6, 7)]
    p.hand = seq4 + [C(8), C(2, "H"), C(9, "H")]
    cid = turns.create_combination(st, "a", ids(seq4))
    turns.extend_combination(st, "a", cid, [p.hand[0].id])        # the 8
    st.player("b").opened = True
    st.current = 1
    with pytest.raises(GameError): turns.extend_combination(st, "b", cid, [st.player("b").hand[0].id])

def test_public_view_hides_other_hands():
    st = new_game(["a", "b"], rng=random.Random(5))
    v = public_view(st, "a")
    assert len(v["my_hand"]) == 13 and v["players"][1]["hand_count"] == 13
    blob = str(v)
    assert not any(f"'{c.id}'" in blob for c in st.player("b").hand)

def test_default_sets_and_auto_decks():
    for n, sets, decks in ((2, 3, 3), (3, 4, 4), (4, 5, 5)):
        st = new_game([f"p{i}" for i in range(n)], rng=random.Random(2))
        assert len(st.sets) == sets and st.config.decks == decks
        assert len(st.draw_pile) >= 26
    st = new_game(["a", "b"], GameConfig(decks=3, extra_sets=5), rng=random.Random(2))   # custom
    assert len(st.sets) == 5 and st.config.decks == 3

def test_too_few_cards_rejected():
    with pytest.raises(GameError): new_game(list("abcd"), GameConfig(decks=2))

def test_custom_teams():
    st = new_game(list("abcdef"), teams={"a": "X", "b": "Y", "c": "X", "d": "Y", "e": "X", "f": "Y"},
                  rng=random.Random(4))                                   # 3 vs 3, alternating seats
    assert {p.team for p in st.players} == {"X", "Y"}
    with pytest.raises(GameError): new_game(["a", "b"], teams={"a": "X"})

def test_empty_draw_pile_adds_deck_or_ends():
    st = game(); st.phase = "draw"; st.draw_pile = []; d0 = st.deck_count
    turns.draw(st, "a")
    assert st.phase == "play" and st.deck_count == d0 + 1 and len(st.draw_pile) == 51
    assert len({c.id for c in st.draw_pile}) == 51
    st = game(refill_deck_when_empty=False); st.phase = "draw"; st.draw_pile = []
    turns.draw(st, "a")
    assert st.phase == "over"
