---
description: Commit pending ASAP Hub work — atomic, short imperative subjects, never push
argument-hint: [optional subject or scope hint]
---

Commit the pending work in this repo. Optional hint from me: $ARGUMENTS

Before committing:
1. Run `git branch --show-current` and sanity-check the branch matches what we're working on. If it looks wrong, stop and tell me instead of committing.
2. Run `git status` and `git diff` to see exactly what's pending.

Commit rules (non-negotiable):
- Short, clear, imperative, single-line subject. No body unless truly necessary.
- No ticket prefix. No Co-Authored-By. No "Generated with" trailers.
- One commit per distinct fix/change — if the pending diff contains multiple unrelated changes, split it into separate atomic commits with appropriate staging.
- Never vague meta-commits like "apply review feedback" or "fix stuff".
- NEVER push. Commit locally only — pushing is always a human decision.

If the working tree also contains unrelated noise (e.g. `.playwright-mcp/`, scratch files), leave it uncommitted and mention it.
