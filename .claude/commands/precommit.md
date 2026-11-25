---
description: Run the ASAP Hub pre-commit pipeline (format → typecheck → lint), fix what it finds, then commit
---

Run the ASAP Hub pre-commit pipeline from the repo root, strictly in this order, fixing any issues found at each step before moving to the next:

1. `yarn fix:format`
2. `yarn typecheck` — if it fails, fix the type errors and re-run until clean.
3. `yarn lint 2>&1 | grep -E "FAIL|●" | tail -500` — lint output is huge, always filter it like this on the first run. If failures appear, fix them and re-run.

4. Once all three steps pass clean, commit the pending work following the `/commit` rules: check `git branch --show-current` looks right first; short, clear, imperative, single-line subjects; no ticket prefix, no Co-Authored-By, no trailers; one commit per distinct fix — split unrelated changes into separate atomic commits; never vague meta-commits. NEVER push — commit locally only.

Rules:
- If a fix you make is non-trivial (not just formatting), summarize what you changed.
- Leave unrelated noise (scratch files, `.playwright-mcp/`, etc.) uncommitted and mention it.
