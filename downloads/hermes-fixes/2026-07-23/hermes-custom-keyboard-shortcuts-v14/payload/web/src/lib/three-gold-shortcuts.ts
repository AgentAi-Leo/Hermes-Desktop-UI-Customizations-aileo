export const THREE_GOLD_GIT_WATCH_PATH = "/git-comments-v27-review";

export const THREE_GOLD_KEYBOARD_ROUTES: Readonly<Record<string, string>> = {
  "1": "/briefs-ai",
  "2": "/brief-stock",
  "3": THREE_GOLD_GIT_WATCH_PATH,
};

export const GIT_WATCH_KEYBOARD_CARD_SELECTOR =
  ".git-comments-issue, .git-comments-archived-row";

export function isThreeGoldKeyboardEditingTarget(
  target: EventTarget | null,
): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean(
    (target as Element).closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

export function wrappedKeyboardIndex(
  currentIndex: number,
  itemCount: number,
  direction: -1 | 1,
): number {
  if (itemCount <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= itemCount) {
    return direction === 1 ? 0 : itemCount - 1;
  }
  return (currentIndex + direction + itemCount) % itemCount;
}
