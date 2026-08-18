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
