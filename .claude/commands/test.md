---
description: Run scoped ASAP Hub workspace tests for a pattern, picking the right workspace automatically
argument-hint: <test pattern or file> [workspace]
---

Run scoped tests in this ASAP Hub monorepo for: $ARGUMENTS

Steps:
1. Determine the correct workspace (`WORKSPACE_PATH`) for the tests:
   - If a workspace was given explicitly in the arguments, use it.
   - Otherwise infer it from the pattern/file and from the files we've been working on in this conversation (e.g. `apps/crn-server`, `apps/gp2-server`, `apps/crn-frontend`, `packages/react-components`, `packages/gp2-components`, `packages/contentful`, …). If genuinely ambiguous between CRN and GP2 variants, run both.
2. Run:
   `WORKSPACE_PATH=<workspace> yarn test:workspace --testPathPattern="<pattern>" --no-coverage`

   The flag is `--testPathPattern`, singular. This repo is on Jest 29.7.0, which silently ignores the plural `--testPathPatterns` — no error, exit 0, and every test in the workspace runs. On a large workspace that looks exactly like a hang. If a "scoped" run starts executing far more files than the pattern should match, check the flag spelling first.
3. If tests touch code in `packages/`, remember that `yarn watch` must be running for package changes to take effect — if failures look like stale compiled output, flag that instead of chasing phantom bugs.
4. Report results: pass/fail counts, and for failures the actual assertion output (not a paraphrase).
