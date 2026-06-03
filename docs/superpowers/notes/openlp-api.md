# OpenLP API — Spike Notes

Confirmed from the OpenLP source (authoritative) on 2026-06-03:
- API v2 routes: https://gitlab.com/openlp/openlp/-/tree/HEAD/openlp/core/api/versions/v2
  (`controller.py`, `core.py`, `plugins.py`) and `openlp/core/api/lib.py` (auth).
- Web remote manual: https://manual.openlp.org/web_remote.html

## Enabling the remote

In OpenLP: **Settings → Remote** → enable the HTTP server. Default port **4316**.
Base URL: `http://<host>:4316/api/v2`.

## Authentication

Optional, **off by default**. The agent adapts at runtime:
- `GET /core/system` → `{ login_required: bool, websocket_port, api_version, ... }`
- If `login_required` is true: `POST /core/login { username, password }` → `{ token }`.
  Default credentials are `openlp` / `password` (changeable in Settings → Remote).
- Send the token on protected calls as the header **`Authorization: <token>`**
  (raw token — **no** `Bearer` prefix). `lib.py` does a plain equality check against
  the registered `authentication_token`.

## Endpoints used by the driver (`pp-agent/drivers/openlp.js`)

| Purpose | Method | Path | Body |
|---|---|---|---|
| Capability/auth probe | GET | `/core/system` | — |
| Login | POST | `/core/login` | `{ username, password }` |
| Next slide | POST | `/controller/progress` | `{ action: "next" }` |
| Previous slide | POST | `/controller/progress` | `{ action: "previous" }` |
| Blank screen (clear) | POST | `/core/display` | `{ display: "blank" }` |
| Show screen | POST | `/core/display` | `{ display: "show" }` |
| Current live item (status) | GET | `/controller/live-items` | — |
| Search songs | GET | `/plugins/songs/search?text=<title>` | — → `[[id, title, alt], …]` |
| Go live with a song | POST | `/plugins/songs/live` | `{ id }` |

`/controller/*` and `/plugins/*/live` are `@login_required`.

## Capabilities (`src/lib/output/capabilities.ts`)

`openlp: { sendSong: true, sendService: false, liveControl: true, status: true, syncLibrary: false, themes: false }`

## ⚠️ Key limitation — no arbitrary lyrics

OpenLP's API has **no** endpoint to display arbitrary text/lyrics not already in
its database (`plugins.py` only exposes search / add-to-service / go-live by id).
So **send-song = search OpenLP's song DB by title, then go live**. If the song
isn't in OpenLP, the driver returns a clear error ("ajoutez-le d'abord dans OpenLP").
The app does NOT push its own lyrics to OpenLP (unlike FreeShow, where we write a
`.show`). A future enhancement could write directly into OpenLP's `songs.sqlite`,
but that's a larger spike and intentionally out of scope here.

## Still to verify live (when OpenLP is installed)

1. Search result shape — confirmed as `[id, title, alt]` arrays from source; verify
   in practice and adjust the match if a newer OpenLP returns objects.
2. `/controller/live-items` JSON shape for the status display (`slides[].selected`, `.text`).
3. Whether `/core/display` is reachable without auth when `login_required` is false
   (expected yes).
