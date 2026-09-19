# 02: Typed Recent foods use the last logged plate

**What to build:** When the user types a food search, a Recent food result carries the last logged amount (`chosenQuantity` and `chosenUnit`). Opening confirm on that row starts on that plate; changing quantity or unit still scales nutrition from the catalog Reference quantities. The subtitle starts with the Food Logging day as `Oct 3 · …`. Catalog hits stay on the Reference serving and have no date prefix. Food Entry timestamps are not added.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] Typed search `source: "recent"` results include `chosenQuantity` and `chosenUnit`. Catalog results do not.
- [ ] Confirm opened from a typed Recent food initializes quantity and unit to that last logged amount. Stored plate nutrition is recovered to catalog-reference nutrition so `scaleFoodNutrition` still runs when the user changes quantity or unit. Unmatched chosen unit falls back to today’s catalog init.
- [ ] Catalog confirm path is unchanged (Reference serving init and scale).
- [ ] Recent food subtitles start with the recency calendar date formatted `en-US` short month + numeric day, then ` · `, then calories / serving / brand. Do not use the `Recent` display label. Catalog rows have no date prefix.
- [ ] Day Log and Food Entry response shapes do not gain `createdAt` or `updatedAt`.
- [ ] Prove this at the two spec seams: recent search contract plus mapper tests, and Confirm Food init/scale tests. No Playwright suite for this ticket.
