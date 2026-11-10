# Bukharo

Real-time multiplayer web version of the Bukharo card game (house rules). Server-authoritative:
the Python engine enforces every rule, and clients only send actions.

| Part | Where | Status |
|---|---|---|
| Rules engine (pure Python, no Django) | `engine/` | done, 27 tests |
| Multiplayer backend (Django + Channels) | `bukharo_site/`, `accounts/`, `rooms/`, `realtime/` | done, 8 tests |
| Web UI (React + TypeScript + Tailwind) | `frontend/` | done; see "Known limits" |
| Round history / cumulative scores | | not built (Phase 4) |
| Docker Compose, Nginx, HTTPS, backups | | not built (Phase 5) |

## Requirements
- Python 3.11+ (developed on 3.12; Django 6 / Channels 4)
- Node.js 18+ and npm
- Optional: Redis (only for running more than one server process) and PostgreSQL

## 1. Setup (once)
```bash
cd bukharo
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate             # creates db.sqlite3

cd frontend && npm install && cd ..
```

## 2a. Run for development (hot reload)
Two terminals, from the project root:
```bash
# terminal 1 - backend (HTTP + WebSocket)
python manage.py runserver 8000

# terminal 2 - frontend
cd frontend && npm run dev           # open http://localhost:5173
```
Vite proxies `/api` and `/ws` to Django, so everything is same-origin.

## 2b. Local deployment (one process, one URL; play with friends on your Wi-Fi/LAN)
```bash
cd frontend && npm run build && cd ..          # builds frontend/dist, which Django then serves
daphne -b 0.0.0.0 -p 8000 bukharo_site.asgi:application
```
- You: http://localhost:8000
- Friends on the same network: `http://<your-LAN-IP>:8000` (find it with `ipconfig` / `ifconfig`).
  Allow port 8000 through your firewall if asked.
- Everyone signs up with a username and password, then:
  1. One person clicks **Create a private room** and shares the 6-character code.
  2. Others enter the code under **Join** (joining closes when the game starts).
  3. In the lobby the host can set teams (same team name = teammates; blank = solo), the number of decks
     and Bukharo sets, opening length, scoring values and the "add a deck when the draw pile runs out" option.
  4. Everyone clicks **I'm ready**; the host clicks **Start game**.
- Rebuild the frontend (`npm run build`) after any change under `frontend/src`.
- Data lives in `db.sqlite3`. Delete it (and re-run `migrate`) for a clean slate.
- This is a local/LAN setup: plain HTTP, `DEBUG` on, no backups. Not hardened for the public internet.

## How to play in the UI
- **Draw** by clicking the draw pile, or **Take whole pile** to pick up the entire discard pile.
- Click cards to select them; **Lay down selected** makes a new pile (the first pile must be a clean sequence of 4+).
- To add to a pile: select cards, then click your team's pile (or drag the cards onto it).
- **Discard selected**, or drag a card onto the discard pile, ends your turn.
- With exactly one card left, **Press down** claims the next Bukharo set; once all sets are claimed, the next press-down ends the round.
- Drag cards in your hand to reorder, or sort by suit/rank. The order is saved in your browser.

## Tests
```bash
python -m pytest tests          # rules engine
python manage.py test           # accounts, rooms, WebSocket consumer (privacy + reconnect)
cd frontend && npx tsc -b       # type-check the UI
```

## Configuration (environment variables, all optional)
| Variable | Meaning |
|---|---|
| `DJANGO_SECRET_KEY` | Set to a random string for anything beyond local play |
| `DJANGO_DEBUG` | `1` (default) or `0` |
| `ALLOWED_HOSTS` | Comma-separated hosts when `DJANGO_DEBUG=0` |
| `REDIS_URL` | e.g. `redis://localhost:6379`. Required to run several server processes; without it an in-memory channel layer is used (single process only) |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` | Use PostgreSQL instead of SQLite |

## Rules as implemented
- Cards have unique IDs per physical card; no jokers; A, 2, 10, J, Q, K are worth 10 in hand, 3-9 face value.
- Sequences: same suit, consecutive, ace low (A-2-3) or high (Q-K-A), no wrap-around. Sets: same rank, any suits.
- 2 is the Ultimate (wild), any number per pile. A 2 in its natural spot is not wild. The Ultimate never leaves its pile
  and repositions itself automatically when the pile changes.
- A pile closes at exactly 7 cards. Closed piles score only their bonus: clean 200, dirty 100; seven Aces or seven 2s 500;
  aces mixed with 2s 250. Open piles score face value.
- Opening needs a clean sequence of 4+. Each press-down is +200 (including the final one); the final pressed card counts nowhere.
- Round ends immediately on the final press-down; score = laid-down points + bonuses - hand penalties, per team.
- Defaults: extra sets = players + 1, decks = players + 1 (allowed 2-8), an empty draw pile gets a fresh shuffled deck.

Judgement calls that were not in your rules (marked `ASSUMPTION` in the code): you can't lay down or extend with your
last card; a lone last card must be pressed, not discarded; you can only extend your own team's piles.

## Known limits
- The UI has been type-checked and built, and the full flow (signup, room, lobby, start, draw) was tested against a real
  running server, but it has not been visually checked or played through in a browser. Expect layout fixes.
- One round per game; no cumulative scores yet. Layout is desktop-oriented.
- No spectators, chat, replay, or reconnection grace handling beyond automatic socket reconnect.

## Layout
```
engine/        cards, combinations (sequence/set/Ultimate), scoring, state, turns, serialize
accounts/      signup / login / logout JSON API
rooms/         models (room, member, game, event), services (all mutations), HTTP API
realtime/      WebSocket consumer (per-player private views)
bukharo_site/  Django settings, ASGI, URLs
frontend/      React + TypeScript + Tailwind UI
tests/         engine tests
```
