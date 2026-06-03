# FreeShow API — Spike Notes (Task 5)

Confirmed from official docs on 2026-06-03:
- API doc: https://freeshow.app/api
- Show format: https://freeshow.app/docs/format-show
- Type source: https://github.com/ChurchApps/FreeShow/blob/main/src/types/Show.ts

## Enabling the API

In FreeShow: **Settings → Connections → API**. Enable it. Two transports are exposed:

| Transport | Port | Notes |
|-----------|------|-------|
| WebSocket (Socket.IO) | 5505 | `socket.emit("data", JSON.stringify({ action, ...data }))` |
| HTTP / REST | **5506** | `POST http://<host>:5506` body `{ action, ...data }` — we use this |

We chose **REST on 5506** because the agent is a stateless Node process; a one-shot
POST per command is simpler than holding a Socket.IO connection. The agent config field
is `freeShowPort` (default 5506).

## Confirmed action ids

| Verb | action id | data |
|------|-----------|------|
| Next slide | `next_slide` | — |
| Previous slide | `previous_slide` | — |
| Clear everything | `clear_all` | — |
| Clear slide/text (presentation layer) | `clear_slide` | — |
| Clear background (media layer) | `clear_background` | — |
| Start show by id | `start_show` | `{ id }` |
| Select show by name | `name_select_show` | `{ value }` |
| Set plain text | `set_plain_text` | `{ id, value }` |

Our `clear` verb maps its `target`: `"presentation"` → `clear_slide`,
`"media"` → `clear_background`, otherwise `clear_all`.

## .show file format

A show on disk is the tuple **`[id, Show]`** in a file named `<id>.show`. The `Show` object
(see `src/lib/freeshow/show-generator.ts`):

```
{ id, name, category, settings:{ activeLayout, template },
  timestamps:{ created, modified, used },
  meta:{ title, author, artist, publisher, CCLI, year },
  slides:{ [id]: { group, color, settings, notes, items:[ { type:"text", style, align,
                  lines:[ { align, text:[ { value, style } ] } ] } ] } },
  layouts:{ [id]: { name, notes, slides:[ { id } ] } },
  media:{} }
```

**Critical:** `settings.activeLayout` MUST equal the layout key, or FreeShow loads the show
but renders no slides. Items position via CSS `style`; without a sensible `style` the text
collapses into a tiny top-left box.

## ⚠️ Still needs live verification (when FreeShow is installed)

These are the assumptions to confirm against a running FreeShow instance:

1. **Folder pickup** — does FreeShow detect a `.show` file dropped into the Shows folder
   without a restart/refresh? If not, `name_select_show` right after the write will miss it.
   The driver writes the file regardless and treats selection as best-effort (non-fatal).
2. **`name_select_show` timing** — confirm it brings the show up live; confirm it matches on
   `meta.title` vs `name`.
3. **CSS defaults** — confirm the chosen `style`/font size renders legibly on a 1080p output;
   adjust `ITEM_STYLE` / `TEXT_STYLE` in `show-generator.ts` if needed.
4. **Tuple vs object on disk** — confirm `[id, show]` is the correct on-disk wrapper for the
   installed FreeShow version (docs describe the inner object; the disk wrapper is the tuple).
5. **Status read** — REST API has no documented "get active slide"; `status` returns nulls.
   Revisit if FreeShow status display is wanted.
