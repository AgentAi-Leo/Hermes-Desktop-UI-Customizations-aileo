import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  search: "",
  getPlugins: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
  beginPluginGeneration: vi.fn(),
  setState: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ search: mocked.search }),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => effect(),
    useRef: <T,>(initial: T) => ({ current: initial }),
    useState: <T,>(initial: T) => [initial, mocked.setState] as const,
  };
});

vi.mock("../lib/api", () => ({
  HERMES_BASE_PATH: "",
  api: { getPlugins: mocked.getPlugins },
}));

vi.mock("./registry", () => ({
  beginPluginGeneration: mocked.beginPluginGeneration,
  getPluginComponent: vi.fn(),
  notifyPluginRegistry: vi.fn(),
  onPluginRegistered: vi.fn(() => () => undefined),
  setPluginLoadError: vi.fn(),
}));

import {
  dashboardPluginProfile,
  isCurrentPluginBatch,
  visiblePluginState,
  usePlugins,
} from "./usePlugins";

describe("dashboardPluginProfile", () => {
  beforeEach(() => {
    mocked.search = "";
    mocked.getPlugins.mockReset();
    mocked.getPlugins.mockResolvedValue([]);
    mocked.beginPluginGeneration.mockReset();
    mocked.setState.mockReset();
  });

  it("reads the preselected profile from a machine-dashboard URL", () => {
    expect(dashboardPluginProfile("?profile=local-ai-assist1")).toBe(
      "local-ai-assist1",
    );
  });

  it("tracks profile changes and decodes URL values", () => {
    expect(dashboardPluginProfile("?profile=profile%20two")).toBe("profile two");
    expect(dashboardPluginProfile("?profile=profile-three")).toBe("profile-three");
  });

  it("falls back to the dashboard process profile when no selection exists", () => {
    expect(dashboardPluginProfile("")).toBe("");
  });

  it("rejects stale manifest batches across an A-to-B-to-A switch", () => {
    expect(isCurrentPluginBatch("profile-a", 3, "profile-a", 1)).toBe(false);
    expect(isCurrentPluginBatch("profile-a", 3, "profile-b", 2)).toBe(false);
    expect(isCurrentPluginBatch("profile-a", 3, "profile-a", 3)).toBe(true);
  });

  it("masks old plugin UI synchronously on the profile-changing render", () => {
    const oldPlugins = [{ name: "old-plugin" }] as unknown as Parameters<
      typeof visiblePluginState
    >[4];
    const oldManifests = [{ name: "old-plugin" }] as unknown as Parameters<
      typeof visiblePluginState
    >[5];

    expect(
      visiblePluginState(
        "profile-b",
        1,
        "profile-a",
        1,
        oldPlugins,
        oldManifests,
        false,
      ),
    ).toEqual({ plugins: [], manifests: [], loading: true });

    const current = visiblePluginState(
      "profile-a",
      1,
      "profile-a",
      1,
      oldPlugins,
      oldManifests,
      false,
    );
    expect(current.plugins).toBe(oldPlugins);
    expect(current.manifests).toBe(oldManifests);
    expect(current.loading).toBe(false);
  });

  it("rejects a delayed same-name registration from an older generation", async () => {
    const registry = await vi.importActual<typeof import("./registry")>(
      "./registry",
    );
    let scriptGeneration = "1";
    const previousDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    );
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        currentScript: {
          getAttribute: (name: string) =>
            name === "data-hermes-plugin-generation"
              ? scriptGeneration
              : null,
        },
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const OldComponent = () => null;
    const NewComponent = () => null;

    try {
      registry.beginPluginGeneration(1);
      registry.registerPlugin("same-name", OldComponent);
      expect(registry.getPluginComponent("same-name")).toBe(OldComponent);

      registry.beginPluginGeneration(2);
      scriptGeneration = "1";
      registry.registerPlugin("same-name", OldComponent);
      expect(registry.getPluginComponent("same-name")).toBeUndefined();

      scriptGeneration = "2";
      registry.registerPlugin("same-name", NewComponent);
      expect(registry.getPluginComponent("same-name")).toBe(NewComponent);
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
      if (previousDocument) {
        Object.defineProperty(globalThis, "document", previousDocument);
      } else {
        Reflect.deleteProperty(globalThis, "document");
      }
    }
  });

  it("refetches plugin manifests with each selected profile", () => {
    mocked.search = "?profile=local-ai-assist1";
    usePlugins();

    mocked.search = "?profile=profile-two";
    usePlugins();

    expect(mocked.getPlugins).toHaveBeenNthCalledWith(1, "local-ai-assist1");
    expect(mocked.getPlugins).toHaveBeenNthCalledWith(2, "profile-two");
    expect(mocked.beginPluginGeneration).toHaveBeenCalledTimes(2);
    expect(mocked.setState).toHaveBeenCalledWith(true);
    expect(mocked.setState).toHaveBeenCalledWith([]);
  });

  it("leaves no prior manifests or plugins after a profile fetch fails", async () => {
    mocked.search = "?profile=broken-profile";
    mocked.getPlugins.mockRejectedValueOnce(new Error("offline"));

    usePlugins();
    await Promise.resolve();
    await Promise.resolve();

    expect(mocked.beginPluginGeneration).toHaveBeenCalledOnce();
    expect(mocked.setState).toHaveBeenCalledWith([]);
    expect(mocked.setState).toHaveBeenCalledWith(false);
  });
});
