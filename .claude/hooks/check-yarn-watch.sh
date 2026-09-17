#!/usr/bin/env bash
# SessionStart hook: warn when `yarn watch` is not running.
#
# Changes in packages/ only reach the apps after the watcher rebuilds them.
# Without it, edits appear to do nothing and the build output stays stale,
# which reads as a bug in the code rather than a missing process.
#
# Stays silent when the watcher is running, so it is only ever noise when it
# is telling you something you need to know.

set -euo pipefail

if pgrep -f 'watch:babel|watch:typecheck|turbo watch' >/dev/null 2>&1; then
  exit 0
fi

cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "yarn watch does not appear to be running. Changes in packages/ will not reach the apps until it is started, and the build output on disk may be stale. If the user reports that an edit has no effect, say so before investigating the code. Start it with `yarn watch` in a separate terminal."
  }
}
JSON

exit 0
