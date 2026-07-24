import { describe, expect, it, vi } from "vitest";
import {
  CUSTOM_TAB_SHORTCUT_MESSAGE_TYPE,
  customTabIndexForShortcut,
  isThreeGoldKeyboardEditingTarget,
} from "./three-gold-shortcuts";

describe("dynamic CUSTOM keyboard shortcuts", () => {
  it("maps digits to the current CUSTOM item order", () => {
    expect(customTabIndexForShortcut("1", 3)).toBe(0);
    expect(customTabIndexForShortcut("2", 3)).toBe(1);
    expect(customTabIndexForShortcut("3", 3)).toBe(2);
    expect(customTabIndexForShortcut("4", 7)).toBe(3);
    expect(customTabIndexForShortcut("7", 7)).toBe(6);
    expect(customTabIndexForShortcut("8", 7)).toBeNull();
  });

  it("supports single-key CUSTOM numbering through nine only", () => {
    expect(customTabIndexForShortcut("9", 9)).toBe(8);
    expect(customTabIndexForShortcut("0", 10)).toBeNull();
    expect(customTabIndexForShortcut("[", 3)).toBeNull();
    expect(customTabIndexForShortcut("]", 3)).toBeNull();
    expect(customTabIndexForShortcut("12", 12)).toBeNull();
  });

  it("uses the validated iframe message type", () => {
    expect(CUSTOM_TAB_SHORTCUT_MESSAGE_TYPE).toBe("hermes-custom-tab-shortcut");
  });

  it("does not intercept text-editing targets", () => {
    const editable = { closest: vi.fn(() => ({ tagName: "INPUT" })) } as unknown as EventTarget;
    const passive = { closest: vi.fn(() => null) } as unknown as EventTarget;
    expect(isThreeGoldKeyboardEditingTarget(editable)).toBe(true);
    expect(isThreeGoldKeyboardEditingTarget(passive)).toBe(false);
    expect(isThreeGoldKeyboardEditingTarget(null)).toBe(false);
  });
});
