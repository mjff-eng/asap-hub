#!/usr/bin/env bash

# The helpers every job shares: logging, the aws wrappers, JSON escaping and the
# failure trap. Sourced, not executed. A caller sets JOB_SCRIPT and defines
# report_failure before calling install_failure_trap, because what a failure is
# recorded against differs per job: an encode marks the video, an ingest marks
# the asset, and both take the tail of the failing step as the message.

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

now() {
  date -u '+%Y-%m-%dT%H:%M:%S.000Z'
}

# wrappers rather than arrays: an empty array expansion trips `set -u` on older bash
aws_s3() {
  if [[ -n "${S3_ENDPOINT:-}" ]]; then
    aws --endpoint-url "$S3_ENDPOINT" s3 "$@"
  else
    aws s3 "$@"
  fi
}

aws_dynamodb() {
  if [[ -n "${DYNAMODB_ENDPOINT:-}" ]]; then
    aws --endpoint-url "$DYNAMODB_ENDPOINT" dynamodb "$@"
  else
    aws dynamodb "$@"
  fi
}

# aws cli takes raw JSON, so the message has to survive quotes and newlines
json_string() {
  printf '%s' "$1" | tr -cd '\11\12\15\40-\176' | awk 'BEGIN { printf "\"" }
    {
      gsub(/\\/, "\\\\")
      gsub(/"/, "\\\"")
      gsub(/\t/, " ")
      if (NR > 1) printf "\\n"
      printf "%s", $0
    }
    END { printf "\"" }'
}

# each step's output goes to a file so only the tail of a failing one is logged
# and carried into the recorded failure
run_step() {
  local label="$1"
  local status=0
  shift
  log "$label"
  "$@" >"$LOG_TAIL_FILE" 2>&1 || status=$?
  if [[ "$status" -ne 0 ]]; then
    log "$(tail -n 20 "$LOG_TAIL_FILE")"
  fi
  return "$status"
}

FAILURE_REPORTED=0
FAILED_LINE=''

on_exit() {
  local status=$?
  if [[ "$status" -ne 0 ]]; then
    report_failure "${JOB_SCRIPT} exited ${status}${FAILED_LINE:+ at line ${FAILED_LINE}}: $(tail -c 400 "$LOG_TAIL_FILE" 2>/dev/null || true)"
  fi
  rm -f "$LOG_TAIL_FILE"
  exit "$status"
}

# EXIT rather than ERR alone, so an unexpected exit still records a state
install_failure_trap() {
  : "${JOB_SCRIPT:?JOB_SCRIPT is required}"
  LOG_TAIL_FILE="$(mktemp)"
  trap 'FAILED_LINE=$LINENO' ERR
  trap on_exit EXIT
}
