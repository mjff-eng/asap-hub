#!/usr/bin/env bash
# PreToolUse hook: refuse Bash commands that write to live Contentful spaces
# or destroy Algolia indices.
#
# These scripts act on whatever space the environment variables point at, which
# on a normal dev machine is a shared environment, not a local sandbox. There is
# no undo: reversing a migration means writing and running a rollback migration.
#
# Creating and dry-running migrations stays allowed, so the normal workflow
# (create -> dryrun -> review) is unaffected. Only the steps that mutate a live
# space need a human to run them by hand.

set -euo pipefail

command=$(jq -r '.tool_input.command // ""')

blocked='contentful:migration:run|contentful:rollback-migration|space:migrate:run|space:rollback-migration|algolia:delete-index|algolia:clear-index|algolia:move-index|algolia:remove-records|migration-run\.sh|migration-rollback-run\.sh'

if printf '%s' "$command" | grep -qE "$blocked"; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "This command writes to a live Contentful space or Algolia index and is blocked for agents. Creating migrations and running dryrun are allowed; run the real migration, rollback or index command yourself once you have reviewed the dryrun output."
  }
}
JSON
fi

exit 0
