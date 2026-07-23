import { describe, expect, it, vi } from "vitest";
import {
  GIT_WATCH_KEYBOARD_CARD_SELECTOR,
  THREE_GOLD_GIT_WATCH_PATH,
  THREE_GOLD_KEYBOARD_ROUTES,
  isThreeGoldKeyboardEditingTarget,
  wrappedKeyboardIndex,
} from "./three-gold-shortcuts";

describe("Three Gold keyboard shortcuts", () => {
  it("maps 1, 2, and 3 to the fixed CUSTOM routes", () => {
    expect(THREE_GOLD_KEYBOARD_ROUTES).toEqual({
      "1": "/briefs-ai",
      "2": "/brief-stock",
      "3": "/git-comments-v27-review",
    });
    expect(THREE_GOLD_GIT_WATCH_PATH).toBe("/git-comments-v27-review");
  });

  it("targets live and archived Git Watch cards", () => {
    expect(GIT_WATCH_KEYBOARD_CARD_SELECTOR).toBe(
      ".git-comments-issue, .git-comments-archived-row",
    );
  });

  it("does not intercept text-editing targets", () => {
    const editable = { closest: vi.fn(() => ({ tagName: "INPUT" })) } as unknown as EventTarget;
    const passive = { closest: vi.fn(() => null) } as unknown as EventTarget;
    expect(isThreeGoldKeyboardEditingTarget(editable)).toBe(true);
    expect(isThreeGoldKeyboardEditingTarget(passive)).toBe(false);
    expect(isThreeGoldKeyboardEditingTarget(null)).toBe(false);
  });

  it("wraps bracket navigation in both directions", () => {
    expect(wrappedKeyboardIndex(-1, 4, 1)).toBe(0);
    expect(wrappedKeyboardIndex(-1, 4, -1)).toBe(3);
    expect(wrappedKeyboardIndex(3, 4, 1)).toBe(0);
    expect(wrappedKeyboardIndex(0, 4, -1)).toBe(3);
    expect(wrappedKeyboardIndex(1, 4, 1)).toBe(2);
    expect(wrappedKeyboardIndex(1, 0, 1)).toBe(-1);
  });
});
