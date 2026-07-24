import { createContext, useContext } from "react";

export const PERSISTENT_FULLSCREEN_SHELL_ID = "hermes-persistent-route-shell";
export const PersistentFullscreenContext = createContext(false);

export function usePersistentFullscreen(): boolean {
  return useContext(PersistentFullscreenContext);
}

const BRIEF_FULLSCREEN_TOGGLE_MESSAGE_TYPES = new Set([
  "hermes-ai-fullscreen-toggle",
  "hermes-stock-fullscreen-toggle",
]);

export const BRIEF_FULLSCREEN_STATE_MESSAGE_TYPES = [
  "hermes-ai-fullscreen-state",
  "hermes-stock-fullscreen-state",
] as const;

export function isBriefFullscreenToggleMessage(value: unknown): boolean {
  return typeof value === "string" && BRIEF_FULLSCREEN_TOGGLE_MESSAGE_TYPES.has(value);
}

type PersistentFullscreenScrollableShell = Pick<HTMLElement, "scrollLeft" | "scrollTop">;
type PersistentFullscreenFrameScheduler = (callback: FrameRequestCallback) => number;

export function settlePersistentFullscreenShellScroll(
  shell: PersistentFullscreenScrollableShell,
  requestFrame: PersistentFullscreenFrameScheduler = requestAnimationFrame,
): void {
  const reset = () => {
    shell.scrollTop = 0;
    shell.scrollLeft = 0;
  };
  reset();
  requestFrame(() => {
    reset();
    requestFrame(reset);
  });
}
