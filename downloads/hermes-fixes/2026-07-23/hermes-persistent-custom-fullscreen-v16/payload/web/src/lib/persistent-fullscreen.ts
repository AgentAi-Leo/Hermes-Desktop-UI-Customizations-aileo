export const PERSISTENT_FULLSCREEN_SHELL_ID = "hermes-persistent-route-shell";

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
