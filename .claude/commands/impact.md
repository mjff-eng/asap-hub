---
description: Work out the blast radius of changing a shared symbol, with a CRN vs GP2 breakdown
argument-hint: <symbol or file path>
---

Analyze the blast radius of changing: $ARGUMENTS

This monorepo ships two products (CRN and GP2) from shared `packages/` code, so a change in a shared package can silently affect both. The point of this command is to find out which, before editing.

Steps:

1. Locate the definition. If the name is ambiguous (CRN and GP2 often have same-named symbols in `apps/crn-server` and `apps/gp2-server`, or in `react-components` and `gp2-components`), list every match and say which one we mean before going further.

2. Find the consumers. Search for imports and call sites across `apps/` and `packages/`, excluding `node_modules`, `build/` and `dist/` — stale build output produces phantom hits that look like real callers. Follow re-exports: a symbol exported through a barrel `index.ts` will have consumers that import from the package root rather than the file, so search both.

3. Group the results by product:
   - **CRN**: `apps/crn-*`, `packages/react-components`
   - **GP2**: `apps/gp2-*`, `packages/gp2-components`
   - **Shared/infra**: `model`, `contentful`, `server-common`, `routing`, `algolia`, `services-common`, etc. Anything here means both products are affected, even if only one is obviously in play.

4. For server-side symbols, trace the layer chain by hand: `routes → controllers → data-providers`. Controllers are injected as interfaces (`@asap-hub/model`), so the wiring is in `apps/*-server/src/app.ts` rather than in the route file — check there to see which concrete implementation is actually passed in.

5. Report a decision, not a dump:
   - Which product(s) need testing, and the specific test files that cover the affected paths.
   - Whether the change needs mirroring in the other product (`/parity` goes deeper on this).
   - Anything risky: a symbol with many consumers, something exported from a package root, or a change to a shared type that both products build against.

If the symbol turns out to be local to one file with no external consumers, say so plainly and stop — no need for the full breakdown.
