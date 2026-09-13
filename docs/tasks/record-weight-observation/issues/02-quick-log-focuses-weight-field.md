# 02: Quick log Log weight enters the daily-summary field

**What to build:** Choosing **Log weight** in Quick log does not open a second form. It dismisses the drawer, scrolls the daily-summary weight field into view, focuses it, and shows a blinking caret so the user can type and blur using the same save path as the pencil.

**Blocked by:** 01: Record or replace a Weight observation from the daily summary.

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] Quick log **Log weight** closes the drawer and moves focus to the daily-summary weight input, scrolled into view, with a visible caret.
- [ ] That focused field is the same editor as the pencil: blur still saves or reverts using ticket 01’s write and cache behavior.
- [ ] The drawer does not collect a weight number of its own.
- [ ] Prove this at the Logs page seam already used for the Log weight control (integration or Logs tests). No new product seam and no Playwright suite for this ticket.
