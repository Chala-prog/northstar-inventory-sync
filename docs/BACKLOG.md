# Reprioritized Backlog — Post-Pivot

**Day / Phase:** Day 5 — Refactor & Review (produced alongside the Scope
Delta Analysis, after the Day 4 webhook pivot shipped)
**Why this exists:** the Day 4 pivot's 48-hour deadline forced several
known gaps to be accepted rather than closed (see Scope Delta Analysis,
§5 "Trade-offs and risks"). This backlog ranks those gaps now that the
immediate deadline pressure is off, so "we knew about it" turns into
"here's the order we'd actually fix it in."

Each item states which day/phase it originated in, so the backlog stays
traceable back to the moment the trade-off was accepted rather than
reading as a fresh wishlist.

---

## P0 — DONE

### 1. Staleness / heartbeat detection — ✅ closed
- **Originated:** Day 4 pivot. Flagged in Scope Delta Analysis §5.
- **Closed by:** `src/staleness.ts` + `/health` now returns `staleSkus`.
  Verified live with a forced low threshold — a real reading was
  correctly flagged as stale, not just reported as an empty list.
- **What's still open:** this reports staleness on request, it doesn't
  alert anyone. Wiring `/health`'s output into real monitoring
  (PagerDuty, a Slack webhook, whatever Northstar uses) is follow-up
  work, not done here.

## P0 — Next up

### NEW: In-memory-only storage — ✅ closed, was the actual top blocker
- **Originated:** identified after the sprint's original scope, when
  asked directly "is this enough for a live service." It wasn't — an
  in-memory `Map` lost all data on every restart, which is worse than
  the staleness gap since it's total data loss, not delayed detection.
- **Closed by:** `src/db.ts`, SQLite via `node:sqlite`. Verified with an
  actual kill-and-restart test — data pushed by one process was read
  back correctly by a completely separate process afterward, not just
  asserted to persist.
- **What's still open:** `node:sqlite` is an experimental Node API
  (`--experimental-sqlite` flag required). Fine for this hardening
  pass; a real production deploy should evaluate a stable client
  (Postgres, most likely, to match whatever Northstar already runs)
  rather than depend on an experimental built-in long-term.

## P1 — Soon after

### NEW: Read-side auth — ✅ closed
- **Originated:** identified in the same "is this enough for a live
  service" review as the persistence gap. `GET /stock/:sku` had zero
  auth — anyone reaching the port could read Northstar's live inventory.
- **Closed by:** `src/readAuth.ts`, a constant-time API-key check.
  Verified live: no key → 401, wrong key → 401, correct key → 200.
- **What's still open:** a single shared key is minimal, appropriate
  for one internal caller (the support tool). A real deployment with
  multiple consumers would want per-client keys or a real auth system.

### 2. Replay protection on the webhook route
- **Originated:** Day 4 pivot. Explicitly scoped out in Scope Delta
  Analysis §5 to keep the pivot inside the 48-hour window.
- **Why it's P1, not P0:** a captured valid request can be replayed with
  a valid signature indefinitely, which is a real gap — but exploiting
  it requires an attacker to already be positioned to intercept a
  legitimate signed request, which the HMAC check (added Day 4) already
  makes non-trivial. Real risk, but lower likelihood than silent
  staleness, which needs no attacker at all.
- **Shape of the fix:** add a timestamp field to the payload contract,
  reject anything older than a few minutes, and track recently-seen
  signatures in a short-lived set to catch same-window replays.

### 3. Real secret management for `WEBHOOK_SECRET`
- **Originated:** Day 4 pivot (`webhookAuth.ts`) — currently falls back
  to a hardcoded demo string if the env var isn't set.
- **Why it's P1:** fine for this prototype, explicitly not fine to ship.
  Groups with replay protection since both are "harden the webhook
  trust boundary" work and are naturally done in the same pass.
- **Shape of the fix:** fail startup loudly if `WEBHOOK_SECRET` isn't
  set in a non-demo environment, rather than silently falling back.

## P2 — Cleanup, no urgency

### 4. Remove dead polling config
- **Originated:** Day 3 build, made obsolete by the Day 4 pivot.
  `config.ts` still exports `POLL_INTERVAL_MS_OVERRIDE`-related helpers
  that nothing reads anymore.
- **Why it's P2:** harmless dead code, not a functional or security
  risk — but it's the one piece of the Day 4 architectural-integrity
  review that was flagged as unclean. Low cost, low urgency, but leaving
  it forever erodes the "deprecated code is visible, not just present"
  discipline the sprint's rules are built around.
- **Shape of the fix:** either delete `getPollIntervalMs()` and its env
  var, or repurpose the file to only hold what webhook mode actually
  uses (`TRACKED_SKUS`, `SERVER_PORT`).

### 5. Automated regression tests
- **Originated:** Day 5 review. All verification so far (Day 3 spec
  compliance, Day 4 pivot, Day 5 regression check) was done via manual
  curl runs captured in-session, not a repeatable test suite.
- **Why it's P2 and not higher:** the manual checks were real and did
  catch real issues during development (e.g., confirming bad signatures
  are rejected). But without an automated suite, nothing stops a future
  change from silently reintroducing the poller or breaking the webhook
  contract — the exact class of regression this sprint's rubric cares
  about catching.
- **Shape of the fix:** a small test file per module (`webhookAuth`,
  `server` route behavior, `stockCache`) would cover the cases already
  exercised manually in this sprint — cheap, since the test cases
  already exist as curl commands in the conversation history.

---

## What's deliberately not on this list

Nothing about reverting to polling or hedging the webhook decision —
per the non-negotiable rules, the Day 4 pivot is final. This backlog is
about hardening the new architecture, not reopening the choice to make
it.
