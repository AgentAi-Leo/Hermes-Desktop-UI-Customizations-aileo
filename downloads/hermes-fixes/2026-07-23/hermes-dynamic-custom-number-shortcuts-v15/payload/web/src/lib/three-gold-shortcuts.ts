export const CUSTOM_TAB_SHORTCUT_MESSAGE_TYPE = "hermes-custom-tab-shortcut";

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

export function customTabIndexForShortcut(
  key: string,
  itemCount: number,
): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  const index = Number(key) - 1;
  return index < itemCount ? index : null;
}
