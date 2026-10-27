#!/usr/bin/env bash
set -Eeuo pipefail

# the EventBridge upload rule sets no JOB, so an unset JOB has to stay an encode
case "${JOB:-encode}" in
encode)
  exec /usr/local/bin/encode.sh "$@"
  ;;
ingest)
  exec /usr/local/bin/ingest.sh "$@"
  ;;
render)
  exec node /usr/local/lib/encoder/render.js "$@"
  ;;
*)
  printf 'unknown JOB %s\n' "$JOB" >&2
  exit 1
  ;;
esac
