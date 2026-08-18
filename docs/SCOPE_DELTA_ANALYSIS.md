# Scope Delta Analysis — Polling → Webhook Pivot

**Author:** Solo submission
**Scope:** Day 4 architectural pivot (polling killed, webhook push adopted)
**Baseline compared:** commit `0b5b7da` (Day 3, spec-complete) → `ca6990f` (Day 4, pivot-complete)
**Raw diff:** 5 files changed, 143 insertions, 45 deletions

---

## 1. What was dropped

| Item | Why it's gone | Where it lives now |
|---|---|---|
| `startPolling()` call in `index.ts` | The vendor is killing the polling API in 48h — no negotiating this back per the non-negotiable rules | Removed from the entry point; `poller.ts` still exists but is `@deprecated` and unreachable from the running service |
| Active use of `fetchStockLevel()` (polling fetch) | Only existed to feed the 5-min poll loop, which no longer runs | Marked `@deprecated` in `warehouseApi.ts`, kept for reference only |
| `POLL_INTERVAL_MS_OVERRIDE` / poll-interval config as a live setting | Nothing reads it anymore since nothing polls | Still defined in `config.ts` for historical/diff clarity, but dead code |
| "5-minute staleness" as the cache's worst case | Under polling, a reading could be up to 5 min stale. That guarantee is gone | Replaced by push-driven freshness (see Added, below) |

**Nothing was silently deleted.** Per the non-negotiable rules, the old path is visibly marked deprecated in the source rather than removed without a trace — verifiable via `poller.ts`'s header comment and via git history.

## 2. What was modified

| Item | Before (Day 3) | After (Day 4) | Breaking? |
|---|---|---|---|
| `GET /health` response | `{ status, trackedSkus }` | `{ status, mode: "webhook-push", trackedSkus }` | No — additive field only |
| `GET /stock/:sku` miss message | `"No cached stock reading for \"X\" yet."` | `"...yet — waiting on a webhook push."` | No — same shape, same status code (404), wording only |
| Cache freshness model | Bounded staleness (≤5 min, guaranteed by poll cadence) | Push-driven (as fresh as the vendor sends it; no upper bound if the vendor stops sending) | **Yes, conceptually** — see Risks below |
| Trust model for incoming data | None needed — we initiated every fetch | Requires HMAC signature verification, since requests now arrive unsolicited | New attack surface introduced, mitigated (see Added) |

Confirmed via a live regression run: `GET /stock/:sku` and `GET /health` both return in the same JSON shape as Day 3, just with the fields noted above. Existing consumers of the query endpoint would not break — full request/response log:
```
GET /stock/SKU-999-NEVER-PUSHED -> 404
{"error":"not_in_cache","sku":"SKU-999-NEVER-PUSHED","message":"No cached stock reading for \"SKU-999-NEVER-PUSHED\" yet — waiting on a webhook push."}

GET /health -> 200
{"status":"ok","mode":"webhook-push","trackedSkus":4}
```

## 3. What was added

| Item | Why it had to exist |
|---|---|
| `POST /webhooks/stock-update` endpoint | The core of the pivot — this is how stock updates arrive now |
| `webhookAuth.ts` — HMAC-SHA256 signature verification, timing-safe compare | Polling never had to trust an inbound caller. Webhooks do. Skipping this would let anyone POST fake stock levels |
| Payload shape validation (`isWebhookPayload`) | Same reasoning — an unsolicited endpoint can't assume the body is well-formed |
| `202 Accepted` / `401` / `400` response codes on the webhook route | New failure modes (bad signature, bad JSON, bad shape) that didn't exist in the polling model, where we controlled both ends of the request |

## 4. Regression check — did the pivot break existing functionality?

**No breaking changes found.** Verified live:
- `GET /stock/:sku` still returns 200 with the cached reading, or 404 with a clear miss message, for both cases.
- `GET /health` still returns 200 with the original fields intact (superset, not replaced).
- A push → immediate read round-trip works end-to-end (`SKU-205` pushed at level 33, read back correctly).
- Signature rejection paths (wrong signature, missing signature, tampered body) all correctly return 401 rather than corrupting the cache or crashing the process.

## 5. Trade-offs and risks introduced by the pivot

- **Freshness is now vendor-dependent, not self-guaranteed.** Polling gave a hard upper bound on staleness (5 min) regardless of the warehouse's behavior. Webhook push has no such guarantee — if the vendor's webhook sender silently stops firing for a SKU, our cache goes stale with no built-in signal that anything's wrong. **Not addressed in this pivot** — flagging it rather than quietly shipping around it. A staleness/heartbeat check would be the natural next addition, out of scope for the 48-hour window.
- **New security surface.** The webhook endpoint is now reachable by anyone who can reach the server. Signature verification mitigates spoofed payloads, but the shared secret (`WEBHOOK_SECRET`) still needs real secret management in production — currently defaults to a hardcoded demo value if the env var isn't set, which is fine for this prototype and explicitly not fine to ship as-is.
- **No replay protection.** A captured valid webhook call could be replayed indefinitely with a valid signature, since there's no timestamp/nonce check. Deliberately left out to keep the pivot scoped to "get off polling in time," not "build a fully hardened webhook receiver."

## 6. Time cost

Pivot (Day 4) took roughly 40–50 minutes of focused work across: signature module, server route rewrite, deprecating the poller, and full end-to-end verification including negative-path testing (bad signatures). No external help used, consistent with the sprint's rules.
