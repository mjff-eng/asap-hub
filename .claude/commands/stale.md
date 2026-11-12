---
description: Diagnose "my change isn't taking effect" in ASAP Hub (watch, branch, stale build output)
---

My change doesn't seem to be taking effect. Diagnose why, checking the usual ASAP Hub suspects in this order:

1. **Branch**: run `git branch --show-current` — does it match the task we're working on? Also `git status`/`git stash list` in case the change lives elsewhere.
2. **yarn watch**: changes in `packages/` only take effect while `yarn watch` is running. Check for a running watch process (`ps aux | grep -i "yarn watch\|turbo watch" | grep -v grep`). If it's not running, that's almost certainly the cause — tell me to start it.
3. **Stale compiled output**: compare mtimes of the edited source file vs the corresponding `build/` output in the same package. If build output predates the source edit, the build is stale.
4. **Wrong product**: confirm the change is in the product actually being run (CRN vs GP2 — e.g. editing `react-components` while testing a GP2 page, or crn-server vs gp2-server).
5. **Process restart**: server-side changes in `apps/*-server` may need the dev server restarted; note if that applies.

Report the diagnosis with evidence (which check failed) and the exact fix, in likelihood order. Don't start "fixing" the code itself — the code is probably fine.
