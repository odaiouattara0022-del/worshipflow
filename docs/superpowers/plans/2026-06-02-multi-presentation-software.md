# Multi-Presentation-Software Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ProSendWorship to drive multiple presentation programs (FreeShow first, after ProPresenter) through a driver abstraction with a capability model, reusing the existing long-poll agent bridge.

**Architecture:** A thin server-side driver layer declares each program's capabilities and enqueues generic commands on the existing bridge. The local agent gains per-program modules (`drivers/propresenter.js`, `drivers/freeshow.js`) and routes by device `type`. Song push content is generated server-side (`.pro` for PP today, new `.show` JSON for FreeShow) and written by the agent. UI reads capabilities and hides unsupported actions.

**Tech Stack:** Next.js 16, TypeScript, Supabase REST adapter (`src/lib/db.ts`), Node agent (`pp-agent/`), Vitest (added in Task 1).

---

## File Structure

**Created:**
- `vitest.config.ts` — test runner config
- `src/lib/output/types.ts` — `OutputType`, `Capabilities`, `OutputStatus`, `LibraryItem`
- `src/lib/output/capabilities.ts` — per-type capability map + `getCapabilities()`
- `src/lib/output/registry.ts` — `getDriver(type)` returning an `OutputDriver`
- `src/lib/output/registry.test.ts`, `src/lib/output/capabilities.test.ts`
- `src/lib/freeshow/show-generator.ts` — `Song` → FreeShow `.show` JSON
- `src/lib/freeshow/show-generator.test.ts`
- `pp-agent/drivers/freeshow.js` — FreeShow protocol module (agent side)
- `docs/superpowers/notes/freeshow-api.md` — spike findings (Task 5)

**Modified:**
- `prisma/schema.prisma` — document `type` + `config` columns on `PPDevice`
- `pp-agent/agent.js` — route dispatch by `config.type`
- `pp-agent/handlers.js` → moved to `pp-agent/drivers/propresenter.js`
- `pp-agent/setup.js` — ask for device type
- `src/app/(app)/settings/page.tsx` — device type selector + capability-driven controls
- `src/app/api/propresenter/control/route.ts` and `send-song/route.ts` — route through `getDriver`
- `package.json` — add vitest + `test` script

**Supabase (manual SQL, Task 2):** add `type`, `config` columns to `PPDevice`.

---

## Task 1: Add Vitest test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Test: `src/lib/output/_smoke.test.ts` (temporary)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: vitest added to devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In `"scripts"`, add: `"test": "vitest run"` and `"test:watch": "vitest"`.

- [ ] **Step 4: Write a smoke test**

Create `src/lib/output/_smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/output/_smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest runner"
```

---

## Task 2: Add `type` + `config` columns to PPDevice

**Files:**
- Modify (Supabase, manual SQL)
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Run SQL on Supabase**

In Supabase Dashboard → SQL Editor, run:
```sql
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'propresenter';
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS config text;
```

- [ ] **Step 2: Verify column exists**

Run in SQL Editor:
```sql
SELECT id, name, type FROM "PPDevice";
```
Expected: existing rows show `type = 'propresenter'`.

- [ ] **Step 3: Document in `prisma/schema.prisma`**

In `model PPDevice`, after the `port` line, add:
```prisma
  type        String   @default("propresenter")
  config      String?
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add type+config columns to PPDevice (multi-output)"
```

---

## Task 3: Output types + capability model (server)

**Files:**
- Create: `src/lib/output/types.ts`
- Create: `src/lib/output/capabilities.ts`
- Test: `src/lib/output/capabilities.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/output/capabilities.test.ts`:
```ts
import { test, expect } from "vitest";
import { getCapabilities } from "./capabilities";

test("propresenter supports everything", () => {
  const c = getCapabilities("propresenter");
  expect(c).toEqual({ sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: true });
});

test("freeshow supports all but themes", () => {
  const c = getCapabilities("freeshow");
  expect(c.liveControl).toBe(true);
  expect(c.sendSong).toBe(true);
  expect(c.themes).toBe(false);
});

test("unknown type falls back to propresenter caps", () => {
  // @ts-expect-error testing runtime fallback
  expect(getCapabilities("nope").liveControl).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- capabilities`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/output/types.ts`**

```ts
export type OutputType = "propresenter" | "freeshow";

export interface Capabilities {
  sendSong: boolean;
  sendService: boolean;
  liveControl: boolean;
  status: boolean;
  syncLibrary: boolean;
  themes: boolean;
}

export interface OutputStatus {
  currentSlide?: string;
  nextSlide?: string;
  presentationName?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
}
```

- [ ] **Step 4: Create `src/lib/output/capabilities.ts`**

```ts
import type { OutputType, Capabilities } from "./types";

export const CAPABILITIES: Record<OutputType, Capabilities> = {
  propresenter: { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: true },
  freeshow:     { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: false },
};

export function getCapabilities(type: string): Capabilities {
  return CAPABILITIES[type as OutputType] ?? CAPABILITIES.propresenter;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- capabilities`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/output/types.ts src/lib/output/capabilities.ts src/lib/output/capabilities.test.ts
git commit -m "feat(output): capability model for presentation backends"
```

---

## Task 4: Driver registry (server)

**Files:**
- Create: `src/lib/output/registry.ts`
- Test: `src/lib/output/registry.test.ts`

The registry returns a driver that enqueues generic bridge commands. Protocol differences live in the agent, so server drivers differ only by `type`, `capabilities`, and (for `sendSong`) which content generator runs.

- [ ] **Step 1: Write the failing test**

Create `src/lib/output/registry.test.ts`:
```ts
import { test, expect, vi } from "vitest";

vi.mock("@/lib/propresenter/bridge", () => ({
  executeViaAgent: vi.fn(async (deviceId: string, command: string, params: unknown) => ({ deviceId, command, params })),
}));

import { getDriver } from "./registry";
import { executeViaAgent } from "@/lib/propresenter/bridge";

test("getDriver exposes type + capabilities", () => {
  const d = getDriver("freeshow");
  expect(d.type).toBe("freeshow");
  expect(d.capabilities.themes).toBe(false);
});

test("next() enqueues a control:next command", async () => {
  const d = getDriver("propresenter");
  await d.next("dev1");
  expect(executeViaAgent).toHaveBeenCalledWith("dev1", "control", { action: "next" });
});

test("clear() forwards the target", async () => {
  const d = getDriver("freeshow");
  await d.clear("dev1", "all");
  expect(executeViaAgent).toHaveBeenCalledWith("dev1", "control", { action: "clear", target: "all" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- registry`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/output/registry.ts`**

```ts
import { executeViaAgent } from "@/lib/propresenter/bridge";
import { getCapabilities } from "./capabilities";
import type { OutputType, Capabilities } from "./types";

export interface OutputDriver {
  type: OutputType;
  capabilities: Capabilities;
  sendSong(deviceId: string, payload: unknown): Promise<unknown>;
  next(deviceId: string): Promise<unknown>;
  previous(deviceId: string): Promise<unknown>;
  clear(deviceId: string, target?: string): Promise<unknown>;
  getStatus(deviceId: string): Promise<unknown>;
}

export function getDriver(type: string): OutputDriver {
  const t = (type as OutputType) ?? "propresenter";
  return {
    type: t,
    capabilities: getCapabilities(t),
    sendSong: (deviceId, payload) => executeViaAgent(deviceId, "send-song", { payload }),
    next: (deviceId) => executeViaAgent(deviceId, "control", { action: "next" }),
    previous: (deviceId) => executeViaAgent(deviceId, "control", { action: "previous" }),
    clear: (deviceId, target) => executeViaAgent(deviceId, "control", { action: "clear", target }),
    getStatus: (deviceId) => executeViaAgent(deviceId, "status", {}),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- registry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/output/registry.ts src/lib/output/registry.test.ts
git commit -m "feat(output): driver registry enqueuing generic bridge commands"
```

---

## Task 5: FreeShow API spike (de-risk)

**Files:**
- Create: `docs/superpowers/notes/freeshow-api.md`

No code — this pins down FreeShow's real API and `.show` format before building against it. Requires FreeShow running on a PC.

- [ ] **Step 1: Enable FreeShow's API**

In FreeShow → Settings → Connection, enable the API/WebSocket. Note the port (default 5505) and any token.

- [ ] **Step 2: Capture the control actions**

From FreeShow docs / the running instance, record the exact action messages for: next slide, previous slide, clear all, select show, select slide. Paste them verbatim into `docs/superpowers/notes/freeshow-api.md` under "Control actions".

- [ ] **Step 3: Capture a real `.show` file**

Create a 2-section song in FreeShow, save it, open the `.show` file from FreeShow's Shows folder, and paste the JSON into the notes under "Show format". Mark which fields are: id, name, slides map, slide groups, text lines, and the layout that orders slides.

- [ ] **Step 4: Record the push mechanism**

Decide and document whether songs are pushed by (a) writing a `.show` file into FreeShow's Shows folder, or (b) an API call to create a show. Note the chosen path under "Push mechanism".

- [ ] **Step 5: Commit the notes**

```bash
git add docs/superpowers/notes/freeshow-api.md
git commit -m "docs: FreeShow API + .show format spike findings"
```

---

## Task 6: FreeShow `.show` generator (server, pure)

**Files:**
- Create: `src/lib/freeshow/show-generator.ts`
- Test: `src/lib/freeshow/show-generator.test.ts`

Generates FreeShow `.show` JSON from a song's title + lyrics. Lyrics are split into sections on blank lines (matching the existing PP behavior). Adjust the exact JSON shape to the Task 5 findings; the test asserts structure, not generated UUIDs.

- [ ] **Step 1: Write the failing test**

Create `src/lib/freeshow/show-generator.test.ts`:
```ts
import { test, expect } from "vitest";
import { generateShow } from "./show-generator";

const song = {
  title: "Amazing Grace",
  lyrics: "Amazing grace how sweet\nThat saved a wretch\n\nWas blind but now I see",
};

test("show has the song name", () => {
  const show = generateShow(song);
  expect(show.name).toBe("Amazing Grace");
});

test("one slide per blank-line-separated section", () => {
  const show = generateShow(song);
  expect(Object.keys(show.slides)).toHaveLength(2);
});

test("layout orders all slides", () => {
  const show = generateShow(song);
  const layoutId = Object.keys(show.layouts)[0];
  expect(show.layouts[layoutId].slides).toHaveLength(2);
});

test("first slide carries its lyric lines", () => {
  const show = generateShow(song);
  const firstSlideId = Object.keys(show.slides)[0];
  const text = JSON.stringify(show.slides[firstSlideId]);
  expect(text).toContain("Amazing grace how sweet");
  expect(text).toContain("That saved a wretch");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- show-generator`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/freeshow/show-generator.ts`**

```ts
import { randomUUID } from "crypto";

interface SongInput { title: string; lyrics: string; }

interface FreeShowSlide {
  group: string | null;
  color: string | null;
  settings: Record<string, unknown>;
  notes: string;
  items: { lines: { text: { value: string }[] }[] }[];
}

export interface FreeShowShow {
  name: string;
  category: string;
  settings: Record<string, unknown>;
  slides: Record<string, FreeShowSlide>;
  layouts: Record<string, { name: string; slides: { id: string }[] }>;
  media: Record<string, unknown>;
}

/** Split lyrics into sections on blank lines; each non-empty section is a slide. */
function splitSections(lyrics: string): string[][] {
  return lyrics
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

export function generateShow(song: SongInput): FreeShowShow {
  const sections = splitSections(song.lyrics);
  const slides: FreeShowShow["slides"] = {};
  const order: { id: string }[] = [];

  sections.forEach((lines, i) => {
    const id = randomUUID();
    slides[id] = {
      group: i === 0 ? "Verse 1" : null,
      color: null,
      settings: {},
      notes: "",
      items: [{ lines: lines.map((value) => ({ text: [{ value }] })) }],
    };
    order.push({ id });
  });

  const layoutId = randomUUID();
  return {
    name: song.title,
    category: "song",
    settings: {},
    slides,
    layouts: { [layoutId]: { name: "Default", slides: order } },
    media: {},
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- show-generator`
Expected: PASS (4 tests).

- [ ] **Step 5: Reconcile with spike findings**

Compare the generated shape to `docs/superpowers/notes/freeshow-api.md` "Show format". Adjust field names if FreeShow differs; keep the tests green (update expected structure only if the real format requires it).

- [ ] **Step 6: Commit**

```bash
git add src/lib/freeshow/show-generator.ts src/lib/freeshow/show-generator.test.ts
git commit -m "feat(freeshow): generate .show JSON from a song"
```

---

## Task 7: Split agent handlers into per-driver modules

**Files:**
- Move: `pp-agent/handlers.js` → `pp-agent/drivers/propresenter.js`
- Modify: `pp-agent/agent.js`

- [ ] **Step 1: Move the handlers file**

```bash
mkdir -p pp-agent/drivers
git mv pp-agent/handlers.js pp-agent/drivers/propresenter.js
```

- [ ] **Step 2: Fix the proto path resolution inside the moved file**

In `pp-agent/drivers/propresenter.js`, any path that used `__dirname` to find `proto/` now needs `..`. Find occurrences of `path.join(__dirname,` referencing `proto` or `setup` and prefix with `".."` (e.g. `path.join(__dirname, "..", "proto", ...)`). Use `process.env.PP_AGENT_BASE_DIR` where already present (it is set in `agent.js`).

- [ ] **Step 3: Add a router in `agent.js`**

In `pp-agent/agent.js`, replace the line `const { dispatch } = require("./handlers");` (inside `runAgent`) with:
```js
const DRIVERS = {
  propresenter: () => require("./drivers/propresenter"),
  freeshow:     () => require("./drivers/freeshow"),
};
const driverType = config.type || "propresenter";
const driverFactory = DRIVERS[driverType] || DRIVERS.propresenter;
const { dispatch } = driverFactory();
```

- [ ] **Step 4: Verify ProPresenter dispatch still loads**

Run: `node -e "require('./pp-agent/drivers/propresenter')"`
Expected: no error (module loads, proto paths resolve).

- [ ] **Step 5: Commit**

```bash
git add pp-agent/agent.js pp-agent/drivers/propresenter.js
git commit -m "refactor(agent): route dispatch by device type (drivers/)"
```

---

## Task 8: FreeShow agent module

**Files:**
- Create: `pp-agent/drivers/freeshow.js`
- Modify: `pp-agent/setup.js`

Implements the same `dispatch(command, params, config)` contract as `propresenter.js`, using the FreeShow API/format documented in Task 5. The structure below is the contract; fill the protocol specifics from the spike.

- [ ] **Step 1: Create `pp-agent/drivers/freeshow.js`**

```js
"use strict";
// FreeShow agent driver. Talks to the local FreeShow API (default ws/http on
// config.freeShowPort, fallback 5505). See docs/superpowers/notes/freeshow-api.md.
const fs = require("fs");
const path = require("path");

async function sendControl(config, action, target) {
  // TODO(spike): send the exact FreeShow action message captured in Task 5.
  // Map: next -> next_slide, previous -> previous_slide, clear -> clear_all.
  const base = `http://${config.ppHost || "127.0.0.1"}:${config.freeShowPort || 5505}`;
  const map = { next: "next_slide", previous: "previous_slide", clear: "clear_all" };
  const fsAction = map[action] || action;
  const res = await fetch(`${base}/api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: fsAction, ...(target ? { value: target } : {}) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`FreeShow ${res.status}`);
  return { ok: true };
}

async function writeShow(config, payload) {
  // payload is the FreeShow .show JSON from src/lib/freeshow/show-generator.ts
  const dir = config.freeShowShowsPath;
  if (!dir) throw new Error("freeShowShowsPath manquant dans la config");
  const file = path.join(dir, `${payload.name}.show`);
  fs.writeFileSync(file, JSON.stringify([payload.name, payload]), "utf8");
  return { ok: true, file };
}

async function dispatch(command, params, config) {
  switch (command) {
    case "control": return sendControl(config, params.action, params.target);
    case "send-song": return writeShow(config, params.payload);
    case "status":
      // TODO(spike): read active slide from FreeShow API
      return { current: null, next: null };
    default:
      throw new Error(`FreeShow: commande non supportée: ${command}`);
  }
}

module.exports = { dispatch };
```

- [ ] **Step 2: Add FreeShow questions to setup**

In `pp-agent/setup.js`, where it currently asks for host/port, add a `type` prompt (propresenter/freeshow). When `freeshow`, also capture `freeShowPort` (default 5505) and `freeShowShowsPath`. Write all into `pp-agent-config.json`.

- [ ] **Step 3: Manual integration test (requires FreeShow running)**

Checklist — perform on the PP/FreeShow PC:
- Configure an agent with `type: "freeshow"`.
- From the app, send a song → confirm a `.show` file appears in FreeShow's Shows folder and opens correctly.
- From the app, press next/previous/clear → confirm FreeShow's live output responds.
- Record results in `docs/superpowers/notes/freeshow-api.md` under "Integration test".

- [ ] **Step 4: Commit**

```bash
git add pp-agent/drivers/freeshow.js pp-agent/setup.js
git commit -m "feat(agent): FreeShow driver module (control + write .show)"
```

---

## Task 9: Route server send/control through the driver + capability gating

**Files:**
- Modify: `src/app/api/propresenter/control/route.ts`
- Modify: `src/app/api/propresenter/send-song/route.ts`

Goal: existing PP behavior unchanged, but the route now resolves the device's `type`, builds the driver, checks the capability, and (for FreeShow) generates the `.show` payload.

- [ ] **Step 1: Read both current routes**

Run: `sed -n '1,80p' "src/app/api/propresenter/control/route.ts"` and the same for `send-song/route.ts`. Note how they currently call the bridge/PP and where `deviceId` comes from.

- [ ] **Step 2: Update `control/route.ts`**

Resolve the device, then:
```ts
import { getDriver } from "@/lib/output/registry";
import { prisma } from "@/lib/db";
// ...inside the handler, after auth + reading { deviceId, action }:
const device = await prisma.ppDevice.findFirst({ where: { id: deviceId } });
if (!device) return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
const driver = getDriver(device.type);
if (!driver.capabilities.liveControl) {
  return NextResponse.json({ error: "Contrôle live non supporté par ce logiciel" }, { status: 400 });
}
if (action === "next") await driver.next(deviceId);
else if (action === "previous") await driver.previous(deviceId);
else if (action === "clear") await driver.clear(deviceId, body.target);
return NextResponse.json({ ok: true });
```

- [ ] **Step 3: Update `send-song/route.ts`**

After resolving the device + song:
```ts
import { getDriver } from "@/lib/output/registry";
import { generateShow } from "@/lib/freeshow/show-generator";
// ...
const driver = getDriver(device.type);
if (!driver.capabilities.sendSong) {
  return NextResponse.json({ error: "Envoi de chant non supporté" }, { status: 400 });
}
const payload = device.type === "freeshow"
  ? generateShow({ title: song.title, lyrics: song.lyrics })
  : /* existing PP .pro payload generation, unchanged */ existingProPayload;
await driver.sendSong(deviceId, payload);
return NextResponse.json({ ok: true });
```
Keep the existing ProPresenter `.pro` generation path exactly as it was for the `propresenter` branch.

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: BUILD succeeds (exit 0).

- [ ] **Step 5: ProPresenter non-regression check**

With a `propresenter` device + agent running: send a song and use next/previous from the app. Confirm identical behavior to before this task.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/propresenter/control/route.ts" "src/app/api/propresenter/send-song/route.ts"
git commit -m "feat(output): route send/control through driver + capability gating"
```

---

## Task 10: UI — device type selector + capability-driven controls

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add a type selector when adding a device**

In the ProPresenter device add/edit form in settings, add a `<select>` bound to a `type` state with options `propresenter` and `freeshow`, default `propresenter`. Include `type` (and FreeShow fields when selected) in the POST/PUT body to the devices API. Relabel the section heading "Appareils ProPresenter" → "Appareils de sortie".

- [ ] **Step 2: Expose capabilities to the control UI**

When a device is selected for live control / send, compute its capabilities:
```ts
import { getCapabilities } from "@/lib/output/capabilities";
const caps = getCapabilities(selectedDevice.type);
```
Disable/hide the live-control buttons when `!caps.liveControl` and the send button when `!caps.sendSong`. Show a small note "Ce logiciel ne supporte pas le contrôle live" when disabled.

- [ ] **Step 3: Build to verify it compiles**

Run: `npm run build`
Expected: BUILD succeeds (exit 0).

- [ ] **Step 4: Manual UI check**

- Add a FreeShow device in settings → it saves with `type: freeshow`.
- Add a (hypothetical) capability-limited device → confirm unsupported buttons are hidden/greyed.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/settings/page.tsx"
git commit -m "feat(ui): output device type selector + capability-driven controls"
```

---

## Self-Review notes

- **Spec coverage:** driver interface (T3/T4), capability model (T3), data model type/config (T2), agent generalization (T7/T8), FreeShow push via .show (T6/T8) + live control (T8/T9), UI selector + gating (T10), PP non-regression (T9 step 5). All spec sections mapped.
- **Deferred per spec (not in plan):** FreeShow themes, FreeShow syncLibrary, OpenLP/EasyWorship drivers, table rename, simultaneous multi-output.
- **Type consistency:** `OutputType`, `Capabilities`, `OutputDriver`, `getDriver`, `getCapabilities`, `generateShow`/`FreeShowShow` used consistently across tasks. Agent contract `dispatch(command, params, config)` matches between `propresenter.js` and `freeshow.js`.
- **Known intentional TODOs:** the FreeShow protocol specifics in `freeshow.js` (Task 8) are marked `TODO(spike)` because they depend on the Task 5 findings — this is sequenced, not a placeholder gap.
