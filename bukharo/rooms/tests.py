import json
from asgiref.sync import sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.test import Client, TransactionTestCase
from engine.serialize import dump, load
from engine.state import new_game
from realtime.routing import websocket_urlpatterns
from rooms import services
from rooms.models import Game, GameEvent, GameRoom

APP = URLRouter(websocket_urlpatterns)


def start_room(*users, config=None):
    room = services.create_room(users[0])
    for u in users[1:]:
        services.join_room(u, room.code)
    if config:
        services.handle(users[0], room.code, {"type": "SET_CONFIG", "config": config})
    for u in users:
        services.handle(u, room.code, {"type": "READY"})
    services.handle(users[0], room.code, {"type": "START"})
    return room


class LobbyTests(TransactionTestCase):
    def setUp(self):
        self.a, self.b = User.objects.create_user("alice"), User.objects.create_user("bob")

    def test_start_needs_ready_and_host(self):
        room = services.create_room(self.a)
        services.join_room(self.b, room.code)
        with self.assertRaises(services.ActionError):                      # nobody ready
            services.handle(self.a, room.code, {"type": "START"})
        services.handle(self.a, room.code, {"type": "READY"})
        services.handle(self.b, room.code, {"type": "READY"})
        with self.assertRaises(services.ActionError):                      # not the host
            services.handle(self.b, room.code, {"type": "START"})
        services.handle(self.a, room.code, {"type": "START"})
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoom.PLAYING)
        self.assertTrue(GameEvent.objects.filter(type="GAME_STARTED").exists())
        with self.assertRaises(services.ActionError):                      # late joiner refused
            services.join_room(User.objects.create_user("carol"), room.code)

    def test_config_and_teams(self):
        room = start_room(self.a, self.b, config={"decks": 3, "extra_sets": 2, "scoring": {"press_down": 150}})
        st = load(Game.objects.get(room=room).state)
        self.assertEqual((st.config.decks, len(st.sets), st.config.scoring.press_down), (3, 2, 150))
        with self.assertRaises(services.ActionError):
            services.handle(self.a, services.create_room(self.a).code, {"type": "SET_CONFIG", "config": {"decks": "x"}})

    def test_api_create_and_join(self):
        c = Client(); self.assertEqual(c.post("/api/rooms/").status_code, 401)
        c.force_login(self.a)
        code = c.post("/api/rooms/").json()["code"]
        c2 = Client(); c2.force_login(self.b)
        self.assertEqual(c2.post(f"/api/rooms/{code}/join/").status_code, 200)
        self.assertEqual(c2.post("/api/rooms/ZZZZZZ/join/").status_code, 400)

    def test_wrong_turn_changes_nothing(self):
        room = start_room(self.a, self.b)
        game = Game.objects.get(room=room); st = load(game.state)
        other = next(u for u in (self.a, self.b) if u.username != st.players[st.current].id)
        with self.assertRaises(services.ActionError):
            services.handle(other, room.code, {"type": "DRAW"})
        self.assertEqual(Game.objects.get(room=room).version, 0)

    def test_state_roundtrips_through_json(self):
        import random
        st = new_game(["a", "b", "c"], rng=random.Random(9))
        again = load(json.loads(json.dumps(dump(st))))
        self.assertEqual(dump(again), dump(st))


async def last_state(comm):
    msg = None
    while not await comm.receive_nothing(timeout=0.3):
        msg = await comm.receive_json_from()
    return msg


class SocketTests(TransactionTestCase):
    async def connect(self, user, code):
        comm = WebsocketCommunicator(APP, f"/ws/rooms/{code}/")
        comm.scope["user"] = user
        ok, _ = await comm.connect()
        return comm, ok

    async def test_play_privacy_and_reconnect(self):
        a = await sync_to_async(User.objects.create_user)("alice")
        b = await sync_to_async(User.objects.create_user)("bob")
        room = await sync_to_async(services.create_room)(a)
        await sync_to_async(services.join_room)(b, room.code)
        ca, _ = await self.connect(a, room.code)
        cb, _ = await self.connect(b, room.code)
        await last_state(ca); await last_state(cb)
        for c in (ca, cb):
            await c.send_json_to({"type": "READY"})
        await last_state(ca); await last_state(cb)
        await ca.send_json_to({"type": "START"})
        sa, sb = await last_state(ca), await last_state(cb)
        self.assertEqual(sa["room"]["status"], "playing")
        cur = sa["game"]["current"]
        mine, theirs = (ca, sa), (cb, sb)
        if cur == "bob":
            mine, theirs = theirs, mine
        await mine[0].send_json_to({"type": "DRAW"})
        sm, st_ = await last_state(mine[0]), await last_state(theirs[0])
        self.assertEqual(len(sm["game"]["my_hand"]), 14)
        self.assertEqual(len(st_["game"]["my_hand"]), 13)
        mine_ids = {c["id"] for c in sm["game"]["my_hand"]}
        blob = json.dumps(st_)                                              # exact quoted ids ('d1-S-1' is a prefix of 'd1-S-12')
        self.assertFalse(any(f'"{i}"' in blob for i in mine_ids))          # opponent never sees my cards
        await theirs[0].send_json_to({"type": "DRAW"})                      # out of turn
        self.assertEqual((await theirs[0].receive_json_from())["type"], "ERROR")
        await theirs[0].disconnect()                                        # reconnect = full state again
        again, ok = await self.connect(b if cur == "alice" else a, room.code)
        self.assertTrue(ok)
        back = await last_state(again)
        self.assertEqual(back["game"]["version"], sm["game"]["version"])
        for c in (ca, cb, again):
            await c.disconnect()

    async def test_outsiders_and_anonymous_rejected(self):
        a = await sync_to_async(User.objects.create_user)("alice")
        eve = await sync_to_async(User.objects.create_user)("eve")
        room = await sync_to_async(services.create_room)(a)
        _, ok = await self.connect(eve, room.code)
        self.assertFalse(ok)
        from django.contrib.auth.models import AnonymousUser
        _, ok = await self.connect(AnonymousUser(), room.code)
        self.assertFalse(ok)
