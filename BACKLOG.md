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

## P0 — Next up

### 1. Staleness / heartbeat detection
- **Originated:** Day 4 pivot. Flagged in Scope Delta Analysis §5 as the
  biggest conceptual risk of the new architecture.
- **Why it's P0:** polling had a *built-in* staleness ceiling — 5
  minutes, guaranteed by the loop. Webhook push has none. If the
  vendor's sender silently stops firing for one SKU, the cache serves a
  confidently-wrong "last known" value forever, with nothing in the
  system noticing. This is the one gap that can cause a silent,
  undetected production incident rather than a loud failure.
- **Shape of the fix:** track `checkedAt` per SKU (already stored on
  `StockReading`) and expose a simple `GET /health` field like
  `staleSkus: string[]` for anything not updated in, say, 2x the
  expected push cadence. Small addition — most of the data needed is
  already in the cache.

## P1 — Soon after

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
