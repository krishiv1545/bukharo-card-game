"""All room/lobby/game mutations. Each call is one DB transaction that locks the room row,
so simultaneous conflicting moves are serialized (Postgres) and a failed move changes nothing."""
from __future__ import annotations
import secrets
from django.db import transaction
from engine import turns
from engine.scoring import ScoringConfig
from engine.serialize import dump, load
from engine.state import GameConfig, GameError, new_game, public_view
from .models import Game, GameEvent, GameRoom, RoomMember

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class ActionError(Exception):
    pass


def create_room(user) -> GameRoom:
    room = GameRoom.objects.create(code="".join(secrets.choice(ALPHABET) for _ in range(6)), host=user)
    RoomMember.objects.create(room=room, user=user)
    return room


def join_room(user, code: str) -> GameRoom:
    with transaction.atomic():
        room = GameRoom.objects.select_for_update().filter(code=code.upper()).first()
        if room is None:
            raise ActionError("no such room")
        if not room.members.filter(user=user).exists():
            if room.status != GameRoom.LOBBY:
                raise ActionError("game already started")
            RoomMember.objects.create(room=room, user=user)
        return room


def build_config(d: dict) -> GameConfig:
    d = dict(d)
    try:
        sc = ScoringConfig(**d.pop("scoring", {}))
        cfg = GameConfig(**d, scoring=sc)
    except TypeError as e:
        raise ActionError(f"bad config: {e}")
    ints = [v for k, v in vars(cfg).items() if k not in ("scoring", "refill_deck_when_empty")] + list(vars(sc).values())
    if any(v is not None and (isinstance(v, bool) or not isinstance(v, int)) for v in ints) \
            or not isinstance(cfg.refill_deck_when_empty, bool):
        raise ActionError("bad config: numbers must be integers")
    return cfg


GAME_ACTIONS = {
    "DRAW": lambda st, p, m: turns.draw(st, p),
    "TAKE_DISCARD": lambda st, p, m: turns.take_discard(st, p),
    "CREATE_COMBINATION": lambda st, p, m: turns.create_combination(st, p, m["card_ids"]),
    "EXTEND_COMBINATION": lambda st, p, m: turns.extend_combination(st, p, m["combo_id"], m["card_ids"]),
    "DISCARD": lambda st, p, m: turns.discard(st, p, m["card_id"]),
    "PRESS_DOWN": lambda st, p, m: turns.press_down(st, p),
}


@transaction.atomic
def handle(user, code: str, msg: dict) -> None:
    room = GameRoom.objects.select_for_update().filter(code=code).first()
    if room is None or not room.members.filter(user=user).exists():
        raise ActionError("not in this room")
    t = msg.get("type")
    if t in GAME_ACTIONS:
        return _game_action(room, user.username, t, msg)
    if room.status != GameRoom.LOBBY:
        raise ActionError("game already started")
    members = list(room.members.select_related("user"))
    if t == "READY":
        room.members.filter(user=user).update(ready=bool(msg.get("ready", True)))
    elif t in ("SET_CONFIG", "SET_TEAM", "START"):
        if room.host_id != user.id:
            raise ActionError("host only")
        if t == "SET_CONFIG":
            cfg = build_config(msg.get("config", {}))
            try:
                cfg.resolve(max(2, len(members)))
            except GameError as e:
                raise ActionError(str(e))
            room.config = msg["config"]
            room.save(update_fields=["config"])
        elif t == "SET_TEAM":
            if not room.members.filter(user__username=msg.get("user")).update(team=str(msg.get("team", ""))[:32]):
                raise ActionError("no such player")
        else:
            _start(room, members)
    else:
        raise ActionError("unknown action")


def _start(room: GameRoom, members: list[RoomMember]) -> None:
    if len(members) < 2:
        raise ActionError("need at least 2 players")
    if not all(m.ready for m in members):
        raise ActionError("everyone must be ready")
    names = [m.user.username for m in members]
    try:
        st = new_game(names, build_config(room.config), {m.user.username: m.team or m.user.username for m in members})
    except GameError as e:
        raise ActionError(str(e))
    game = Game.objects.create(room=room, state=dump(st))
    GameEvent.objects.bulk_create(GameEvent(game=game, player=e.get("player", ""), type=e["event"],
                                            data={k: v for k, v in e.items() if k not in ("event", "player")})
                                  for e in st.log)
    room.status = GameRoom.PLAYING
    room.save(update_fields=["status"])


def _game_action(room: GameRoom, username: str, t: str, msg: dict) -> None:
    if room.status != GameRoom.PLAYING:
        raise ActionError("game not in progress")
    game = Game.objects.select_for_update().get(room=room)
    st = load(game.state)
    try:
        GAME_ACTIONS[t](st, username, msg)
    except GameError as e:
        raise ActionError(str(e))
    except (KeyError, TypeError):
        raise ActionError("malformed action")
    game.state, game.version = dump(st), game.version + 1
    game.save(update_fields=["state", "version", "updated"])
    GameEvent.objects.bulk_create(GameEvent(game=game, player=e.get("player", ""), type=e["event"],
                                            data={k: v for k, v in e.items() if k not in ("event", "player")})
                                  for e in st.log)
    if st.phase == "over":
        room.status = GameRoom.FINISHED
        room.save(update_fields=["status"])


def view_for(user, code: str) -> dict | None:
    """Everything this one player may see. None if they are not in the room."""
    room = GameRoom.objects.filter(code=code).select_related("host").first()
    if room is None or not room.members.filter(user=user).exists():
        return None
    out = {"room": {"code": room.code, "status": room.status, "host": room.host.username, "config": room.config,
                    "members": [{"username": m.user.username, "ready": m.ready, "team": m.team}
                                for m in room.members.select_related("user")]},
           "game": None}
    game = Game.objects.filter(room=room).first()
    if game:
        out["game"] = public_view(load(game.state), user.username)
        out["game"]["version"] = game.version
    return out
