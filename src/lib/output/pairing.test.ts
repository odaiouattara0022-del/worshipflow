import { test, expect } from "vitest";
import { deviceNameFor, buildConfig, newPendingDevice, announceResponse } from "./pairing";

test("device name combines software label and hostname", () => {
  expect(deviceNameFor("freeshow", "PC-LOUANGE")).toBe("FreeShow — PC-LOUANGE");
  expect(deviceNameFor("propresenter", "STUDIO")).toBe("ProPresenter — STUDIO");
});

test("device name falls back to the label when hostname is missing", () => {
  expect(deviceNameFor("freeshow", "")).toBe("FreeShow");
  expect(deviceNameFor("freeshow", null)).toBe("FreeShow");
});

test("unknown type defaults to ProPresenter", () => {
  expect(deviceNameFor("something-else", "X")).toBe("ProPresenter — X");
});

test("config is built only for FreeShow and only from present fields", () => {
  expect(buildConfig({ installId: "i", type: "propresenter" })).toBeNull();
  expect(buildConfig({ installId: "i", type: "freeshow", detected: {} })).toBeNull();
  expect(
    buildConfig({ installId: "i", type: "freeshow", detected: { freeShowPort: 5506, freeShowShowsPath: "C:/Shows" } })
  ).toBe(JSON.stringify({ freeShowPort: "5506", freeShowShowsPath: "C:/Shows" }));
});

test("a new pending device is created with a withheld token and pending status", () => {
  const d = newPendingDevice(
    { installId: "abc", hostname: "PC1", type: "freeshow", detected: { freeShowPort: 5506 } },
    "tok-123"
  );
  expect(d.status).toBe("pending");
  expect(d.installId).toBe("abc");
  expect(d.agentToken).toBe("tok-123");
  expect(d.agentOnline).toBe(false);
  expect(d.name).toBe("FreeShow — PC1");
  expect(d.config).toBe(JSON.stringify({ freeShowPort: "5506" }));
  // host/port are required NOT NULL columns — must always be populated.
  expect(d.host).toBe("127.0.0.1");
  expect(d.port).toBe(5506);
  expect(d.libraryPath).toBe("");
});

test("a ProPresenter pending device defaults the port to 1025", () => {
  const d = newPendingDevice({ installId: "x", hostname: "PC2", type: "propresenter" }, "t");
  expect(d.port).toBe(1025);
  expect(d.host).toBe("127.0.0.1");
});

test("an OpenLP pending device uses its label, port 4316, and config", () => {
  const d = newPendingDevice(
    { installId: "o", hostname: "PC3", type: "openlp", detected: { openLpPort: 4316 } },
    "t"
  );
  expect(d.type).toBe("openlp");
  expect(d.name).toBe("OpenLP — PC3");
  expect(d.port).toBe(4316);
  expect(d.config).toBe(JSON.stringify({ openLpPort: "4316" }));
});

test("announce response withholds the token until the device is active", () => {
  expect(announceResponse({ status: "pending", agentToken: "secret" })).toEqual({ status: "pending" });
  expect(announceResponse({ status: "rejected", agentToken: "secret" })).toEqual({ status: "rejected" });
  expect(announceResponse({ status: "active", agentToken: "secret" })).toEqual({
    status: "active",
    agentToken: "secret",
  });
});

test("announce response treats a missing status as active (legacy rows)", () => {
  expect(announceResponse({ agentToken: "legacy" })).toEqual({ status: "active", agentToken: "legacy" });
});
