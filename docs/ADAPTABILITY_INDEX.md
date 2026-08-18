# Adaptability Index — Self-Assessment (Confidential)

**Subject period:** Day 4 pivot (polling killed with 48h notice, no extension, no scope negotiation)
**Note on confidentiality:** per the sprint's non-negotiable rules, this
index is meant for aggregate-only release. Contents below are an honest
self-rating, not written for external persuasion.

---

## Composure — 4/5

Reacted to the pivot by immediately scoping what had to change rather
than treating it as a setback to process first: identified the three
things a polling→webhook swap actually requires (new inbound endpoint,
signature verification, removing the old call site) before writing any
code. No time was spent on denial or trying to find a way to keep
partial polling alongside webhooks — the "no negotiating scope back"
rule was treated as final from the start, not tested.

**Docked one point** because composure under a *harder* pivot than this
one is untested here — this refactor, while real, was well-bounded and
completed comfortably inside the 48h window with time to spare. I don't
have evidence of how I'd hold up against a pivot that hit a genuine
dead end.

## Communication — 4/5

The Scope Delta Analysis documents exactly what was dropped, modified,
and added, with a regression check backed by actual request/response
logs rather than assertions. Trade-offs (staleness risk, missing replay
protection) are stated plainly rather than glossed over or hidden in
"future work" language to make the deliverable look more finished than
it is.

**Docked one point** because this was all written after the fact. A
stronger communication showing would include a note flagged *during*
the pivot the moment the staleness trade-off became apparent, not
reconstructed afterward for the write-up.

## Flexibility — 5/5

The architecture change here isn't cosmetic: control flow inverted
(pull → push), a new trust boundary was introduced and handled properly
(HMAC verification, not skipped), and the old code path was cut cleanly
rather than left duplicated "just in case." Nothing from Day 3 was
defended out of attachment to prior work — the polling module was
deprecated the moment it stopped being the right answer.

## Contribution to deliverable quality — 4/5

Shipped code that's actually verified end-to-end, including negative
paths most people wouldn't bother testing under time pressure (wrong
signature, missing signature, tampered body). That's a meaningful
contribution to deliverable quality beyond "it compiles."

**Docked one point** because solo work means there's no evidence here of
contribution *to a team* — coordinating a pivot, unblocking a teammate,
or absorbing someone else's scope. This index can only speak to
individual execution, not team dynamics.

## Would I want this person handling the next production incident? — Yes, with a caveat

The caveat: everything above was demonstrated on a well-scoped, solvable
pivot. The honest gap in this self-assessment is that it says nothing
about how I'd perform if the 48-hour deadline had landed on a pivot
that *didn't* have a clean solution — where "ship something imperfect"
was the only option. That's the harder version of this test, and this
sprint didn't happen to produce it.

---
**Overall: 4.25 / 5.** Solid technical execution and honest
documentation under real time pressure; the main gap is that this
particular pivot, while real, wasn't hard enough to fully stress-test
composure or communication under genuine ambiguity.
