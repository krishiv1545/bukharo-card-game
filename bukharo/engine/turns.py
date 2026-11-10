"""Turn actions. Each validates fully, then mutates; a rejected action changes nothing."""
from __future__ import annotations
from .cards import Card, build_deck, shuffled
from .combinations import Combination, InvalidCombination, validate
from .scoring import score_round
from .state import GameState, PlayerState, GameError

MIN_AFTER_OPEN = 3


def _turn(st: GameState, pid: str, phase: str) -> PlayerState:
    if st.phase == "over":
        raise GameError("game is over")
    p = st.players[st.current]
    if p.id != pid:
        raise GameError("not your turn")
    if st.phase != phase:
        raise GameError(f"you must {'draw' if st.phase == 'draw' else 'play/discard'} now")
    return p


def _pick(p: PlayerState, ids: list[str]) -> list[Card]:
    if len(set(ids)) != len(ids):
        raise GameError("duplicate card id")
    by_id = {c.id: c for c in p.hand}
    if any(i not in by_id for i in ids):
        raise GameError("card not in your hand")
    return [by_id[i] for i in ids]


def _remove(p: PlayerState, cards: list[Card]) -> None:
    gone = {c.id for c in cards}
    p.hand = [c for c in p.hand if c.id not in gone]


def _log(st: GameState, pid: str, event: str, **data) -> None:
    st.log.append({"event": event, "player": pid, **data})


# ---- drawing -------------------------------------------------------------
def draw(st: GameState, pid: str) -> None:
    p = _turn(st, pid, "draw")
    if not st.draw_pile:
        if not st.config.refill_deck_when_empty:
            _log(st, pid, "DRAW_PILE_EMPTY")
            finish(st)
            return
        st.deck_count += 1                       # fresh shuffled deck keeps the match going
        st.draw_pile = shuffled(build_deck(st.deck_count))
        _log(st, pid, "DECK_ADDED", deck=st.deck_count)
    p.hand.append(st.draw_pile.pop())
    st.phase = "play"
    _log(st, pid, "DRAW")


def take_discard(st: GameState, pid: str) -> None:
    p = _turn(st, pid, "draw")
    if not st.discard_pile:
        raise GameError("discard pile is empty")
    n = len(st.discard_pile)
    p.hand.extend(st.discard_pile)       # the entire face-up pile
    st.discard_pile.clear()
    st.phase = "play"
    _log(st, pid, "TAKE_DISCARD", count=n)


# ---- laying down ---------------------------------------------------------
def create_combination(st: GameState, pid: str, card_ids: list[str]) -> str:
    p = _turn(st, pid, "play")
    cards = _pick(p, card_ids)
    if len(p.hand) - len(cards) < 1:
        raise GameError("keep a card to discard or press")
    try:
        if not p.opened:   # opening: a CLEAN sequence of 4+, no wilds, no sets
            lay = validate(cards, st.config.opening_len)
            if lay.kind != "sequence" or lay.dirty:
                raise GameError("opening needs a clean sequence (same suit, no Ultimate)")
        cid = f"c{st.combo_seq + 1}"
        combo = Combination.create(cid, p.team, p.id, cards, MIN_AFTER_OPEN)
    except InvalidCombination as e:
        raise GameError(str(e))
    st.combo_seq += 1
    st.combos[cid] = combo
    _remove(p, cards)
    p.opened = True
    _log(st, pid, "CREATE_COMBINATION", combo=cid, cards=card_ids)
    return cid


def extend_combination(st: GameState, pid: str, combo_id: str, card_ids: list[str]) -> None:
    p = _turn(st, pid, "play")
    if not p.opened:
        raise GameError("open first")
    combo = st.combos.get(combo_id)
    if combo is None:
        raise GameError("no such combination")
    if combo.team != p.team:             # ASSUMPTION: only your own team's piles
        raise GameError("that combination belongs to another team")
    cards = _pick(p, card_ids)
    if len(p.hand) - len(cards) < 1:
        raise GameError("keep a card to discard or press")
    try:
        new = combo.extend(cards)        # re-validates; the Ultimate repositions itself
    except InvalidCombination as e:
        raise GameError(str(e))
    st.combos[combo_id] = new
    _remove(p, cards)
    _log(st, pid, "EXTEND_COMBINATION", combo=combo_id, cards=card_ids)


# ---- ending the turn -----------------------------------------------------
def discard(st: GameState, pid: str, card_id: str) -> None:
    p = _turn(st, pid, "play")
    if len(p.hand) == 1:                 # ASSUMPTION: a last card must be pressed, not discarded
        raise GameError("your last card must be pressed down")
    (card,) = _pick(p, [card_id])
    _remove(p, [card])
    st.discard_pile.append(card)
    st.current = (st.current + 1) % len(st.players)
    st.phase = "draw"
    _log(st, pid, "DISCARD", card=card_id)


def press_down(st: GameState, pid: str) -> None:
    p = _turn(st, pid, "play")
    if len(p.hand) != 1:
        raise GameError("press-down needs exactly one card in hand")
    p.pressed.append(p.hand.pop())
    nxt = next((s for s in st.sets if s.claimed_by is None), None)
    if nxt is None:                      # every extra set is gone -> round ends now
        _log(st, pid, "FINAL_PRESS_DOWN")
        finish(st)
        return
    nxt.claimed_by = p.id                # the claimed set becomes the active hand
    p.hand = nxt.cards
    nxt.cards = []
    p.claimed_sets.append(nxt.index)
    _log(st, pid, "PRESS_DOWN", set=nxt.index)   # turn continues: lay down, then discard


# ---- scoring -------------------------------------------------------------
def finish(st: GameState) -> None:
    """Per team: laid-down piles (+bonuses) minus every member's leftover hand.
    Pressed cards live in PlayerState.pressed, so they count on neither side."""
    st.phase = "over"
    result = {}
    for team in {p.team for p in st.players}:
        members = [p for p in st.players if p.team == team]
        result[team] = score_round(
            [c for c in st.combos.values() if c.team == team],
            [c for p in members for c in p.hand],
            sum(len(p.pressed) for p in members),   # every press-down earns the bonus
            st.config.scoring)
    st.result = result
    st.log.append({"event": "GAME_OVER"})
