# Northstar Retail Co. — Live Inventory Sync Service (Sprint 2)

**Client:** Northstar Retail Co.
**Ask:** a live inventory sync service so their support tool's "is this
in stock?" answers stay accurate.
**Status:** shipped, on the current spec (webhook push), verified
end-to-end. Full history of how it got here is in git, not summarized
away.

This package is the whole sprint, assembled as one deliverable — not a
retelling of it. Every claim below is backed by a git commit and a live
verification run captured earlier in the build process.

---

## What's actually running today

```
src/
  stockCache.ts    — in-memory cache, keyed by SKU
  webhookAuth.ts    — HMAC-SHA256 signature verification (timing-safe)
  server.ts        — HTTP server: POST /webhooks/stock-update, GET /stock/:sku, GET /health
  config.ts        — tracked SKU catalog, server port
  index.ts         — entry point: starts the server, no polling
  warehouseApi.ts   — DEPRECATED, kept for history (see below)
  poller.ts        — DEPRECATED, kept for history (see below)
```

Run it:
```
npm install
npm run build && npm start
```

Northstar's support tool now gets stock answers by us **receiving**
pushes from the warehouse the moment a level changes (`POST
/webhooks/stock-update`, HMAC-signed), rather than us asking every 5
minutes. `GET /stock/:sku` is what the support tool actually calls.

## How the sprint got here — Days 1 through 5

| Day | Phase | What happened | Commit(s) |
|---|---|---|---|
| 1–2 | Solo recon | Learned TypeScript from zero, alone, on a scaled-down mock of this same domain (mock warehouse API + cache). 5 real compiler blockers hit and resolved with no outside help — see `docs/LEARNING_AND_BLOCKER_JOURNAL.md` | `9ef1a33` |
| 3 | Original build | Built the spec as first given: poll the warehouse API every 5 minutes, cache stock, expose a query endpoint. Verified live — two real poll cycles observed, endpoint queried mid-run | `0b5b7da`, `f133488`, `cd2496b` |
| 4 | Forced pivot | Northstar's polling API killed with 48h notice, no extension. Rebuilt the ingestion path as webhook push: new trust boundary (signature verification), new failure modes handled (bad signature, bad payload), old polling code cut and marked `@deprecated`, not left running alongside the new path | `ca6990f` |
| 5 | Refactor & review | Shipped the pivoted spec, regression-checked it against Day 3's behavior (no breaks found), documented exactly what the pivot cost (`docs/SCOPE_DELTA_ANALYSIS.md`), ranked what's still owed (`docs/BACKLOG.md`), and self-rated how the pivot was handled (`docs/ADAPTABILITY_INDEX.md`) | `d4d2b7c`, `56c253e` |

## Why polling code is still in this repo

Per the sprint's non-negotiable rules, deprecated code must be visibly
marked, not silently deleted or left running side-by-side with its
replacement. `poller.ts` and the polling half of `warehouseApi.ts` are
still here, tagged `@deprecated`, and — verifiably, not just by
claim — unreachable from `index.ts`. `git log` and `git diff
0b5b7da ca6990f` show exactly what the pivot changed.

## Verification, not assertion

Every phase above was confirmed by actually running the service, not
just typechecking it:
- Day 3: two live poll cycles observed, `GET /stock/SKU-100` and
  `GET /stock/SKU-317` returned real cached values mid-run.
- Day 4: a signed webhook push was accepted and immediately readable;
  a wrong signature, a missing signature, and a tampered body were all
  correctly rejected with `401`.
- Day 5: `GET /stock/:sku` and `GET /health` regression-checked against
  Day 3's shapes — additive changes only, nothing broken.

## Known gaps, ranked

See `docs/BACKLOG.md`. Short version: staleness/heartbeat detection is
the one gap that can fail silently (P0); replay protection and real
secret management are next (P1); dead config cleanup and an automated
test suite are cleanup, not urgent (P2).

## Docs

- `docs/LEARNING_AND_BLOCKER_JOURNAL.md` — Assignment 1
- `docs/SCOPE_DELTA_ANALYSIS.md` — Assignment 2
- `docs/BACKLOG.md` — Assignment 2 (trade-off documentation)
- `docs/ADAPTABILITY_INDEX.md` — Assignment 3 (self-rated; see note
  below)

**Note on Assignment 3:** the index in this package is a self-assessment,
produced solo. The sprint's own design calls for *peer*-rated
adaptability — this package can't manufacture a peer that didn't exist
in a solo run, so that gap is stated here rather than glossed over.
