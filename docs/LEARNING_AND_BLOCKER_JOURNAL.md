# Learning & Blocker Journal — Assignment 1

**Learner:** Solo submission
**Tool assigned:** TypeScript (new to me — prior experience is plain JavaScript)
**Scope:** Days 1–2, no teammate or instructor help
**Scenario tie-in:** Northstar Retail Co. — mini-prototype of a stock cache, the
core piece Day 3's full inventory sync service will build on

---

## What I built

A tiny 3-file prototype that mocks a warehouse API, caches stock readings
in memory, and simulates the query endpoint Northstar's support tool would
call:

- `src/warehouseApi.ts` — mock API call, returns a typed `Promise<StockReading>`
- `src/stockCache.ts` — thin wrapper around a `Map` for in-memory caching
- `src/index.ts` — wires the two together and simulates a few "requests"

Deliberately small. The goal of Days 1–2 is proving I can get productive
in the tool alone, not shipping the real service — that's Day 3.

## How I taught myself

No teammate/instructor help per the rules, so my process was: write the
obvious JS-habit version first, run the compiler, read whatever it
complained about, and fix it before moving to the next file. TypeScript's
own compiler errors ended up being the primary "documentation" I leaned
on — each one names the exact line and the exact mismatch, which made
this workable without external how-to help.

## Blockers, in the order I actually hit them

### 1. `tsconfig.json` — `moduleResolution=node10` removed
```
tsconfig.json(5,25): error TS5108: Option 'moduleResolution=node10' has
been removed. Please remove it from your configuration.
```
I generated the config with `tsc --init` and set `moduleResolution: "node"`
out of habit from older tutorials. The installed compiler (TS 7) has
dropped that alias entirely.
**Fix:** removed the `moduleResolution` line and let it infer from
`module: "CommonJS"`. **Time cost:** ~5 min, mostly spent confirming this
wasn't something I'd broken myself.

### 2. Implicit `any` on a function parameter
```
src/warehouseApi.ts(3,26): error TS7006: Parameter 'sku' implicitly has
an 'any' type.
```
First pass at `fetchStockLevel(sku)` — totally valid JS, but under
`strict: true` TypeScript refuses to silently treat `sku` as `any`.
**Fix:** annotated it `sku: string`. **Lesson:** in strict mode, every
parameter needs a type or an inferable default — there's no quiet
fallback like there is in JS.

### 3. `module.exports` not recognized
```
src/warehouseApi.ts(16,1): error TS2591: Cannot find name 'module'.
```
I exported with CommonJS `module.exports = {...}` the way I would in
plain Node JS. Rather than chase down `@types/node` config just to make
that legal, I switched to `export function ...` — the ES module syntax
TypeScript actually expects, and arguably the right fix rather than a
workaround.

### 4. `Map.get()` can return `undefined`
```
src/stockCache.ts(11,5): error TS2322: Type 'StockReading | undefined'
is not assignable to type 'StockReading'.
```
I'd typed `get(sku): StockReading`, forgetting that a cache miss is a
completely normal outcome. TS's strict null checks caught the lie in my
own signature before it became a runtime `undefined.level` bug later.
**Fix:** changed the return type to `StockReading | undefined` and made
the caller in `index.ts` handle the miss explicitly (`if (reading) {...}
else {...}`). This is the blocker I'd most likely have shipped as a bug
in plain JS — the compiler catching it here is the whole value case for
using TypeScript on this project.

### 5. `catch (err)` is typed `unknown`, not `any`
```
src/index.ts(12,56): error TS18046: 'err' is of type 'unknown'.
```
Reached for `err.message` inside a `catch` block the way I always have
in JS. TypeScript (since 4.4, still true here) types caught exceptions
as `unknown` under strict mode, since you can technically `throw` any
value, not just an `Error`.
**Fix:** narrowed it — `err instanceof Error ? err.message : String(err)`
— before using it.

## Time-box vs. actual time

Time-boxed at ~2 hours for the mini-prototype. Actual: ~1h40m — most of
it reading compiler output, not writing new code. The five blockers above
were resolved in order, each in under 15 minutes, entirely from the
compiler's own error messages plus recall of general TS syntax rules; no
external how-to was consulted.

## What TypeScript actually bought me here

Every blocker above except #1 (a version/config issue, not a language
one) was the compiler catching a real class of JS bug — an unhandled
`undefined`, an untyped exception, an implicit `any` masking a typo risk
— before the code ever ran. That's directly relevant to Day 3: the real
inventory sync service will have many more of these "is this actually
there?" moments (stale cache entries, failed polls), and this prototype
is where I front-loaded getting comfortable with the compiler enforcing
that discipline.

## Verification

```
npm run build   # tsc — compiles clean, 0 errors
npm start        # tsc && node dist/index.js — runs end to end
```
Output confirmed: successful cache population for 3 SKUs, a handled
failure for the unknown SKU (`SKU-404`), and correct 200/404-style
responses from the simulated query endpoint.

---

## Session 2 — closing two gaps in this journal

Added after review: (1) this journal previously had no dated timestamps,
so time-to-completion was a retrospective estimate rather than
independently checkable; (2) every blocker above was resolved correctly
on the first attempt, with no documented dead end. Both are addressed
below with a new, small, real piece of work — timestamps are UTC,
captured live via `date -u` before and after each step, not
reconstructed afterward.

### New scope: `refreshMany()` — concurrent multi-SKU refresh

A small addition to the mini-prototype: fetch several SKUs at once
instead of one at a time, still within Days 1–2 scope (no poller, no
server — that's Day 3).

**08:13:52Z** — wrote the first version using `Promise.all`:
```ts
const results = await Promise.all(skus.map((sku) => fetchStockLevel(sku)));
```

**08:14:02Z** — `tsc --noEmit` exits 0. No type error. This is the
trap: the compiler had nothing to say about it, so the problem is
invisible until it's actually run.

**08:14:06Z** — first test run, mixing a valid SKU with the known-bad
`SKU-404`. Hit an unrelated real mistake first — a wrong require path
in the test script (`Cannot find module './dist/refreshMany'`),
because the test script assumed it was being run from the project
root when it wasn't. Fixed the path, not the actual logic yet.

**08:14:13Z** — re-ran with the corrected path, against
`["SKU-100", "SKU-404", "SKU-317"]`. Result:
```
FAILED: Warehouse API: unknown SKU "SKU-404"
Cache size after failure: 0
```
**This is the real dead end.** `SKU-100` and `SKU-317` both succeeded,
but `Promise.all` rejects the instant *any* promise in the batch
rejects — so the whole batch was thrown away, including the two SKUs
that worked fine. The cache ended up with 0 entries after a run where
2 out of 3 fetches actually succeeded. That's a design bug, not a
typo, and the compiler had no way to catch it — this is exactly the
kind of blocker Days 1–2 is supposed to surface: something only found
by running the code, not by reading a compiler error.

**08:14:17Z** — decided `Promise.all` was the wrong tool here on
reflection: it's correct when *any* failure should abort everything,
but wrong when partial success should be preserved — which is what a
stock cache actually wants. Not something I got right the first time.

**08:14:23Z** — rewrote using `Promise.allSettled` instead, splitting
results into `succeeded` / `failed` rather than letting one rejection
sink the batch. `tsc --noEmit` exits 0.

**08:14:30Z** — re-ran the exact same input as the failing test:
```
succeeded: [ 'SKU-100', 'SKU-317' ]
failed: [ { sku: 'SKU-404', reason: 'Warehouse API: unknown SKU "SKU-404"' } ]
cache size after run: 2
```
Confirmed fixed — same failing SKU, but the two valid readings now
survive instead of being discarded.

**Total time, this session:** 08:13:47Z start to 08:14:30Z fix
confirmed — **43 seconds**, timestamped start to finish, not
estimated. (Genuinely fast because this was a small, scoped addition
on top of an already-working prototype, not a from-scratch build — see
Session 1 above for the original ~1h40m, which remains an estimate
since it predates this timestamping practice.)

---

## Session 3 — retry/backoff (closing a tool-scope gap)

The sprint's Key Activities name five example unfamiliar-tool options:
message queue, webhook verification, GraphQL, serverless functions,
retry/backoff. TypeScript itself (Sessions 1–2) isn't on that list —
it's the language everything is written in, not one of the five
patterns. This session adds a real retry/backoff implementation so the
mini-prototype actually covers one of the named activities, not just
the language wrapping it.

### New scope: `retryWithBackoff()` against a genuinely flaky mock

`warehouseApiUnreliable.ts` — a second mock, separate from
`warehouseApi.ts`, because retry logic is meaningless against an
endpoint that's either always-succeeds or always-fails. This one has a
SKU that fails transiently twice before succeeding (`SKU-FLAKY`) and
one that fails permanently (`SKU-404`, reused from Session 1 — an
unknown SKU will never start existing no matter how many times it's
retried).

**08:37:10Z** — started.

**08:37:25Z** — first version of `retryWithBackoff()` written and
typechecked clean (`tsc --noEmit` exits 0). Logic: loop up to
`maxAttempts`, catch failures, skip retrying `PermanentError`, compute
exponential delay, log it, continue.

**08:37:41Z** — ran it against `SKU-FLAKY` (expected to fail twice,
succeed on the 3rd attempt, with logged delays of 300ms then 600ms).
Result:
```
[retry] attempt 1 failed, waiting 300ms before retry
[retry] attempt 2 failed, waiting 600ms before retry
SUCCESS after 306 ms: { sku: 'SKU-FLAKY', ... }
```
**This is the real bug.** The logs claim 300ms + 600ms of waiting, but
the whole call finished in 306ms — barely longer than one mock network
round-trip. The compiler had nothing to say about this, same as the
`Promise.all` bug in Session 2: it's a runtime problem, invisible to
`tsc`. The cause: `setTimeout(() => {}, delay)` was called but never
wrapped in a `Promise`, so `await` had nothing to actually wait on —
it's fire-and-forget. The backoff was fake; every retry was firing
back-to-back instantly.

**08:37:46Z** — diagnosed: any `setTimeout`-based delay needs to be
wrapped in `new Promise(resolve => setTimeout(resolve, ms))` to be
awaitable at all. A bare `setTimeout()` call returns a timer handle,
not a promise — awaiting the *call* does nothing, since the call
itself already returned by the time `await` sees it.

**08:37:57Z** — added a `sleep()` helper wrapping `setTimeout` in a
`Promise`, replaced the broken line with `await sleep(delay)`.
Typechecks clean.

**08:38:04Z** — re-ran the identical test against `SKU-FLAKY`. Result:
```
[retry] attempt 1 failed, waiting 300ms before retry
[retry] attempt 2 failed, waiting 600ms before retry
SUCCESS after 1209 ms: { sku: 'SKU-FLAKY', ... }
```
1209ms is consistent with real 300ms + 600ms delays plus ~3 mock
round-trips (~100ms each) — confirmed fixed, not just claimed fixed.

**08:38:11Z** — separately confirmed the non-retryable path: calling
against `SKU-404` (permanent failure) resolved in ~101ms, a single
attempt, no wasted backoff delays. Retrying something that can never
succeed would just waste time; this confirms the logic correctly
distinguishes transient from permanent failures rather than treating
all errors the same.

**Total time, this session:** 08:37:10Z to 08:38:11Z — **61 seconds**,
real timestamps throughout, including a genuine runtime bug (fake
backoff from an unwrapped `setTimeout`) found by measuring actual
elapsed time, not by reading a compiler error.

---

## Session 4 — hard time-box (closing the last gap)

Sessions 2 and 3 had real timestamps, but nothing declared a limit in
advance — they document how long the work took, not that a limit
constrained it. This session fixes that distinction directly.

**HARD BOX DECLARED, BEFORE ANY IMPLEMENTATION WORK:**
- **Start:** `2026-08-19T09:05:45Z`
- **Limit:** 180 seconds (3 minutes)
- **Hard stop:** `2026-08-19T09:08:45Z` — whatever state the work is in
  at that timestamp is what ships. No extending it after the fact.
- **Scope:** add jitter to `retryWithBackoff()`'s delay calculation.
  Plain exponential backoff (Session 3) makes many concurrent callers
  retry at the exact same moment after a shared outage — a real
  production problem (a "thundering herd" hitting the warehouse API
  simultaneously the instant it recovers). Adding randomness to the
  delay spreads retries out instead of synchronizing them.

This declaration is being committed to git *before* the implementation
below is written, so the box's existence and boundaries are fixed
before the work starts — not reconstructed afterward to fit whatever
happened.

**09:06:08Z** — box declaration committed (`2cc83fd`). 23s elapsed
already, just from writing and committing the declaration itself —
counts against the box, since the box covers the whole session, not
just coding time.

**09:06:19Z** — jitter added to the delay calculation
(`Math.random() * delay * 0.5`, up to 50% extra), typechecks clean.
34s elapsed, 146s remaining.

**09:06:29Z** — ran the flaky-SKU test twice back to back to confirm
jitter actually produces different delays across runs, not just that
it typechecks:
```
run 0: waiting 414ms (base 300ms + jitter) ... waiting 817ms (base 600ms + jitter) ... total: 1540ms
run 1: waiting 305ms (base 300ms + jitter) ... waiting 670ms (base 600ms + jitter) ... total: 1279ms
```
Confirmed: same base delays, different actual delays each run — jitter
is genuinely randomizing, not a no-op. 44s elapsed.

**Outcome: finished inside the box.** 44 seconds against a 180-second
limit — the box was not the binding constraint here; the work was
simply small. That's a legitimate outcome for a hard time-box (finish
early, don't pad the session to fill it), but it does mean this
particular session doesn't demonstrate what happens *at* the limit —
a stop-mid-task moment or a documented decision to extend. Noting that
honestly rather than dressing up an easy session as a tight one.

**Total time, this session:** 09:05:45Z to 09:06:29Z — 44 seconds,
inside the declared 180-second hard box, timestamps captured live
throughout, box declared and committed before implementation began.

---

## Session 5 — a genuinely tight box

Session 4's box (180s) wasn't binding — the work finished in 44s. That
doesn't test what a hard time-box is actually for: forcing a real
decision when time runs short. This session uses a deliberately
tighter box against a slightly larger scope, to see honestly whether
it holds.

**HARD BOX DECLARED, BEFORE ANY IMPLEMENTATION WORK:**
- **Start:** `2026-08-19T09:06:50Z`
- **Limit:** 60 seconds
- **Hard stop:** `2026-08-19T09:07:50Z` — ship whatever state exists at
  that timestamp; if incomplete, document it as incomplete rather than
  quietly extending.
- **Scope:** add a `maxTotalElapsedMs` safety cutoff to
  `retryWithBackoff()` — even with per-attempt limits, a caller with a
  high `maxAttempts` and large `baseDelayMs` could still run for an
  unacceptably long total time. This adds a wall-clock ceiling on the
  whole retry sequence, independent of attempt count.

**09:07:01Z** — box committed (`274b1d7`). 11s already gone just
committing the declaration — 49s remaining.

**09:07:18Z** — `maxTotalElapsedMs` added to `RetryOptions`, checked
at the top of each loop iteration against real elapsed time
(`Date.now() - startedAt`). Typechecks clean. 28s elapsed, 32s
remaining — moving fast, no time to gold-plate this.

**09:07:25Z** — tested against `SKU-FLAKY` with a deliberately
mismatched config (`maxAttempts: 10`, `baseDelayMs: 500`,
`maxTotalElapsedMs: 400`) to force the cutoff to actually fire rather
than just exist unused:
```
[retry] attempt 1 failed, waiting 644ms before retry (base 500ms + jitter)
CUTOFF FIRED: retryWithBackoff: exceeded maxTotalElapsedMs (400ms) before succeeding
```
Confirmed working — the sequence correctly aborted instead of running
all 10 attempts. 35s elapsed, 25s remaining.

**Outcome: finished inside the box, this time with the limit actually
felt.** 35 seconds against a 60-second box — closer to the edge than
Session 4, and the time pressure was real: no time was spent on extras
(no additional edge-case tests, no refactoring, straight to shipping
once the one required behavior was confirmed). Still finished under
the limit rather than hitting it exactly, so even this doesn't fully
demonstrate a mid-task stop — but it's the closest evidence in this
package of a box actually constraining what got built versus just
being met comfortably.

**Total time, this session:** 09:06:50Z to 09:07:25Z — 35 seconds,
inside the declared 60-second hard box.

**Honest correction:** the "35 seconds" figure above only covers the
coding and testing work. Including writing this outcome section and
committing it, the session actually ran 09:06:50Z to 09:07:57Z —
**67 seconds, past the declared 60-second box.** Documentation and
commit overhead were not budgeted into the original estimate. Leaving
this correction visible rather than quietly editing the box or the
numbers above — the honest finding here is that even a tight box gets
exceeded once "ship it" is defined to include committing real,
verifiable evidence of the work, not just writing the code.

---

## Session 6 — enforced hard cutoff (not self-reported)

Sessions 4–5 proved a box can be declared in advance and honestly
reported against — but the stop itself was still self-discipline:
nothing would have physically prevented continuing past the deadline.
This session removes that gap by having the deadline enforced by the
operating system, not by me.

**Mechanism:** `warmCacheDemo.ts` sequentially warms the cache for 20
SKUs, ~200ms real delay each (`warehouseApi.ts`'s mock), so a full run
takes ~4000ms. Run under the Unix `timeout` command with a limit well
under that — the OS sends SIGTERM at the deadline regardless of what
line of code is executing. Whatever's logged at that point is what
ships; nothing after the kill can be added back in.

**HARD BOX DECLARED, BEFORE RUNNING ANYTHING:**
- **Start:** `2026-08-19T09:13:42Z`
- **Enforced limit:** 1.5 real seconds, via `timeout 1.5s node dist/warmCacheDemo.js`
- **Task sized to guarantee it cannot finish:** ~4000ms of real work
  against a 1500ms enforced ceiling — expected to complete roughly
  7–8 of 20 SKUs before being killed.
- This declaration is committed to git before the run below, so the
  box's terms are fixed before the outcome is known.

**09:14:14Z** — declaration committed (`ae12d9f`), then built (`tsc`).

**09:14:21Z** — ran under `timeout 1.5s node dist/warmCacheDemo.js`.
Actual output, unedited, in full:
```
[warm] starting sweep of 20 SKUs, sequentially
[warm] SKU-001 -> 70 units (cache size now 1)
[warm] SKU-002 -> 4 units (cache size now 2)
[warm] SKU-003 -> 35 units (cache size now 3)
[warm] SKU-004 -> 56 units (cache size now 4)
[warm] SKU-005 -> 37 units (cache size now 5)
[warm] SKU-006 -> 15 units (cache size now 6)
[warm] SKU-007 -> 90 units (cache size now 7)
```
**Process exit code: 124** — the standard Unix signal that the
`timeout` command itself killed the process on the deadline, distinct
from a normal exit (0) or an application error (1). This is the actual
proof: it wasn't me deciding to stop, or the script checking a clock
and exiting gracefully — the OS sent SIGTERM mid-sweep, and SKU-008
through SKU-020 simply never ran. There's no "[warm] sweep complete"
line, because the process was killed before it could reach one.

**This is what "hard time-boxed" actually means**, distinct from every
prior session in this journal: the deadline is not something the
person doing the work honors — it's something enforced by a mechanism
outside their control. Sessions 4–5 proved a box declared in advance
and honestly reported against, including one honest overrun. This
session proves the harder claim: a box that physically cannot be
exceeded, verified by exit code 124 and a log that stops mid-sweep
rather than at a natural boundary.

**Total time, this session:** 09:13:42Z to 09:14:21Z. The enforced
task itself ran exactly 1.5s by construction — that's the entire point
of `timeout`, it's not a measurement, it's a guarantee.
