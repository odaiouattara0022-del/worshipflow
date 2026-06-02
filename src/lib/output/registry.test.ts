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
