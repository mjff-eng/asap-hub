#!/usr/bin/env bash
# PreToolUse hook: refuse any Bash command that runs `git push`.
#
# Publishing to the remote is a human decision in this repo: create a branch,
# push it yourself, open a PR against master, get a colleague review, then merge.
#
# Matches `push` only as a git subcommand, so read-only commands that merely
# contain the word (git config --get push.default, git log --grep=push) run fine.

set -euo pipefail

command=$(jq -r '.tool_input.command // ""')

# Global options may sit between `git` and the subcommand, including ones that
# take a separate value (-C <path>, -c <k>=<v>, --git-dir=<path>).
git_option='-[^[:space:]]+|--[^[:space:]]+[[:space:]]+[^[:space:]-][^[:space:]]*|-[cC][[:space:]]+[^[:space:]]+'
push_invocation="(^|[[:space:]])git([[:space:]]+(${git_option}))*[[:space:]]+push([[:space:]]|$)"

# Split on separators so `yarn typecheck && git push` is checked as two commands.
if printf '%s' "$command" | tr ';|&' '\n' | grep -qE "$push_invocation"; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "git push is blocked in this repo. Pushing is a human decision: create a branch, push it yourself, open a PR against master, and get a colleague review before merging."
  }
}
JSON
fi

exit 0
