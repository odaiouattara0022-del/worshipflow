# Zero-Config Agent Pairing — Design

**Date:** 2026-06-03
**Status:** Approved (design)
**Depends on:** `feature/multi-presentation-software` branch (multi-software driver + FreeShow).

## Problem

Connecting a presentation PC (ProPresenter / FreeShow) to ProSendWorship is too
technical for a worship-team volunteer. Today they must: create a device in the
app, copy its UUID, open a terminal, run `node`/the `.exe`, type the server URL,
paste the ID, choose the type, enter the port and Shows folder. We want: download
one file, double-click, click "Approve" once. Nothing else.

## Target Experience

1. Admin clicks **"Télécharger l'agent"** in the app (one generic file, not per-device).
2. User double-clicks it on the presentation PC. No terminal, no input.
3. The agent auto-detects whether **ProPresenter** or **FreeShow** is running,
   finds the port and (for FreeShow) the Shows folder, and announces itself.
4. A card appears in the app: *"Nouvel appareil détecté : FreeShow sur PC-LOUANGE —
   [Approuver] [Rejeter]"*. Admin clicks **Approuver**. The device goes online.

The only human actions: one double-click + one "Approuver" click.

## Architecture

### Data model — new columns on `PPDevice` (additive, idempotent SQL)

| Column | Type | Meaning |
|---|---|---|
| `installId` | text | Identity the agent generates for itself (UUID), stored locally next to the exe. Used to recognise the same install across reboots and re-announces. |
| `status` | text NOT NULL DEFAULT `'active'` | `'pending'` \| `'active'` \| `'rejected'`. Default `'active'` keeps every existing row working. |
| `hostname` | text | PC name reported by the agent; shown on the approval card. |

(The `type` + `config` columns from the multi-presentation migration are a
prerequisite and ship in the same migration batch.)

### New endpoint — `POST /api/pp-bridge/announce` (public, rate-limited)

The agent introduces itself. No admin session — this is the device knocking.

- Body: `{ installId, hostname, type, detected: { freeShowPort?, freeShowShowsPath? } }`
- If `installId` is unknown → create a `status:'pending'` device: auto name
  (`"FreeShow — <hostname>"`), `type`, `config` JSON built from `detected`, a freshly
  minted `agentToken`, `agentOnline:false`. Return `{ status: 'pending' }`.
- If `installId` is known → return `{ status }`, **including `agentToken` only when
  `status === 'active'`**. Idempotent; re-announcing has no side effects beyond a
  heartbeat.
- If `status === 'rejected'` → return `{ status: 'rejected' }` so the agent stops.

### Auth hardening — `resolveDevice`

`resolveDevice` (Bearer-token lookup used by `/poll`, `/ack`, `/result`) returns a
device **only when `status === 'active'`**. A pending or rejected device's token
cannot poll or receive commands. Existing active devices are unaffected.

### Approval — admin routes (session-guarded via `requireSession`)

- `POST /api/propresenter/devices/[id]/approve` → `status:'active'`.
- `POST /api/propresenter/devices/[id]/reject`  → `status:'rejected'`.
- `GET /api/propresenter/devices` includes `status` so the UI can split the list.

### Agent — rewritten boot sequence

1. **Server URL resolution** (chicken-and-egg): `PSW_SERVER` env var →
   `serveur.txt` next to the exe → baked default `https://prosendworship.vercel.app`.
   The end user never touches this; the override exists for preview/local testing.
2. **Identity:** load `pp-agent-id.json` (`{ installId }`) next to the exe, or
   create it with a new UUID.
3. **Auto-detect:**
   - Software: Windows process check (`FreeShow%` / `ProPresenter%`) with a TCP
     port-probe fallback (5506 / 1025). Picks the type.
   - FreeShow Shows folder: default `~/Documents/FreeShow/Shows` if it exists.
   - FreeShow REST port: 5506.
4. **Announce loop:** POST `/announce` every few seconds. While `pending`, wait and
   show "En attente d'approbation…". On `active`, capture `agentToken`, persist the
   full config, and enter the existing `/poll` loop unchanged. On `rejected`, exit
   with a clear message.

### UI — devices page

- New **"Appareils en attente d'approbation"** section: each pending device shows an
  icon, *"<Type> détecté sur <hostname>"*, and **Approuver** / **Rejeter** buttons.
  The list refreshes periodically so a freshly-announced agent appears within seconds.
- The download block becomes a single **"Télécharger l'agent"** + two lines:
  "Téléchargez, double-cliquez, puis approuvez ici."
- The manual add form (type + ID + host/port) moves under a collapsible **"Avancé"**
  as a fallback. The old `register` flow stays intact for already-deployed `.exe`
  agents (backward compatible).

## Backward Compatibility

- Existing devices: `status` defaults to `'active'`, no `installId` — they keep
  working via their current `agentToken` and the old register/manual flow.
- Already-deployed `.exe` agents: unaffected; `/register`, `/poll`, `/ack`, `/result`
  keep their contracts.
- The ProPresenter control/send paths are unchanged (preserved byte-for-byte by the
  multi-presentation work).

## Testing

- **Unit (Vitest):** `announce` create-vs-recognise logic (pending on first sight,
  token withheld until active, idempotent re-announce); `resolveDevice` rejects
  non-active; auto-detect type selection given mocked process/port signals; server
  URL resolution precedence.
- **Build:** `npm run build` green.
- **Live (user, on a preview deploy):** download agent → double-click → see pending
  card → approve → device online → send a song to FreeShow + next/clear from Live.

## Deployment Plan (production safety)

1. Run the additive SQL on Supabase (adds `type`, `config`, `installId`, `status`,
   `hostname`) — **before** any code that reads them goes live.
2. Deploy the branch to a **Vercel preview URL** (does not touch the church's live
   site). User tests FreeShow there with the agent pointed at the preview URL.
3. Once confirmed, **promote to production** (merge to `master`).

## Out of Scope (YAGNI)

- Multi-tenant / multi-church server discovery (one deployment for now).
- Network auto-discovery across LAN (the agent runs ON the presentation PC).
- Auto-approval without an admin click (kept as a deliberate one-click security gate).
