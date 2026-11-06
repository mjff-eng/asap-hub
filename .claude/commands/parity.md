---
description: Find the CRN↔GP2 counterpart of a feature/component and compare them
argument-hint: <component, feature, or file>
---

Find the counterpart of this across the two ASAP Hub products and compare them: $ARGUMENTS

Mapping between the products:
- UI: `packages/react-components` (CRN) ↔ `packages/gp2-components` (GP2)
- Frontends: `apps/crn-frontend` ↔ `apps/gp2-frontend`
- Servers: `apps/crn-server` ↔ `apps/gp2-server` (routes → controllers → data-providers)
- Auth frontends and messages apps follow the same crn-/gp2- naming.
- Shared code (`model`, `contentful`, `server-common`, `routing`, `algolia`) serves both — a "counterpart" there may be a single shared implementation with product-specific branches.

Steps:
1. Locate the given feature in its product, then search for the equivalent in the other (names often match but not always — search by behaviour/route/content-type too).
2. Compare the two: props/API surface, behaviour, styling approach, test coverage, and any recent fix present in one but not the other.
3. Report: where each lives (clickable `file:line` refs), the meaningful differences, and a verdict — does a change we made (or plan to make) in one side need mirroring in the other? If no counterpart exists, say so explicitly.
