# Hermes AI single rail + clean date top v25

This release corrects the two BRIEFS-AI defects visible after v24:

1. normal mode displayed both the App-owned gold rail and the archive iframe rail;
2. immediate previous/next date navigation could restore an old topic/scroll position or let iframe focus scroll the fullscreen shell, clipping the top of the active Brief.

## Correction

- The App-owned gold toolbar is the only visible AI toolbar in both normal and fullscreen modes.
- Every AI preview is generated with parent-toolbar ownership, so the sandboxed archive controller remains active while its duplicate visual rail and placeholder are hidden.
- Every AI date-navigation path (buttons, keyboard, date rail, and iframe messages) resets the destination document to `scrollX=0, scrollY=0` instead of restoring a remembered topic.
- The App-owned fullscreen shell now has a live scroll lock for the entire fullscreen lifetime. Any later iframe-focus scroll is immediately returned to zero.
- Stock viewport/date behavior is unchanged.

## Required proof

- RED/GREEN tests for single ownership and clean destination top;
- focused Brief and fullscreen tests;
- complete repository tests (with unrelated resource-sensitive plugin test also run isolated);
- typecheck and production build;
- sealed-package verification;
- cleanroom upgrade and exact rollback;
- native install and Brave traversal across all five dates in both directions and both wraps;
- at every settled date: exactly one rail, shell scroll zero, iframe scroll zero, canonical hero visible, and Founder Takeaways begins cleanly below the hero.

The installer accepts the exact sealed v24 predecessor and earlier verified predecessors, makes a complete source/dist backup, and emits a one-step rollback command.
