/**
 * Focus a DOM element after React has flushed pending updates.
 *
 * Uses a double-requestAnimationFrame so the callback runs *after*
 * the browser has painted the React commit — a single rAF often fires
 * before React's own rAF-based cleanup, causing focus to target a
 * node that is about to be removed.
 */
export function focusAfterPaint(
  getElement: () => HTMLElement | null | undefined,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = getElement();
      if (el && el.isConnected && typeof el.focus === "function") {
        el.focus();
      }
    });
  });
}

/**
 * Try to focus the first element from a priority-ordered list of
 * candidates. Useful for post-delete fallback focus.
 */
export function focusFirstAvailable(
  ...candidates: Array<HTMLElement | null | undefined>
): void {
  focusAfterPaint(() =>
    candidates.find((el) => el && el.isConnected) ?? null,
  );
}

