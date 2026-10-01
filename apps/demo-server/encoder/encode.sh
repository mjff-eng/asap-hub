#!/usr/bin/env bash
set -Eeuo pipefail

: "${S3_OBJECT_KEY:?S3_OBJECT_KEY is required}"
: "${BUCKET_NAME:?BUCKET_NAME is required}"
: "${TABLE_NAME:?TABLE_NAME is required}"

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
# logging, the aws wrappers, json escaping and the failure trap
# shellcheck source=common.sh
. "${SCRIPT_DIR}/common.sh"
# the sprite, poster, upload and ready flip are shared with the other jobs that
# produce a watchable video
# shellcheck source=finish.sh
. "${SCRIPT_DIR}/finish.sh"

SPRITE_TARGET_TILES="${SPRITE_TARGET_TILES:-100}"
SPRITE_TILE_WIDTH="${SPRITE_TILE_WIDTH:-160}"
SPRITE_COLUMNS="${SPRITE_COLUMNS:-10}"
SKIP_AWS="${SKIP_AWS:-0}"
WORK_DIR="${WORK_DIR:-/scratch}"

# raw/{videoId}/original.mp4
VIDEO_ID="$(printf '%s' "$S3_OBJECT_KEY" | cut -d/ -f2)"
if [[ -z "$VIDEO_ID" || "$VIDEO_ID" == "$S3_OBJECT_KEY" ]]; then
  log "ERROR cannot derive videoId from S3_OBJECT_KEY=$S3_OBJECT_KEY"
  exit 1
fi

report_failure() {
  local message="$1"
  if [[ "$FAILURE_REPORTED" == "1" ]]; then
    return
  fi
  FAILURE_REPORTED=1
  log "FAILED $message"
  if [[ "$SKIP_AWS" == "1" ]]; then
    return
  fi
  # the condition keeps a delete that raced the encode from resurrecting the item
  aws_dynamodb update-item \
    --table-name "$TABLE_NAME" \
    --key "{\"PK\":{\"S\":\"VIDEO#${VIDEO_ID}\"},\"SK\":{\"S\":\"META\"}}" \
    --update-expression 'SET processingState = :state, processingError = :error' \
    --condition-expression 'attribute_exists(PK)' \
    --expression-attribute-values \
    "{\":state\":{\"S\":\"failed\"},\":error\":{\"S\":$(json_string "${message:0:500}")}}" \
    >/dev/null || log "WARN could not record the failure on VIDEO#${VIDEO_ID}"
}

JOB_SCRIPT='encode.sh'
install_failure_trap

mkdir -p "$WORK_DIR"
INPUT_FILE="${WORK_DIR}/original"
STREAM_FILE="${WORK_DIR}/stream.mp4"

log "start videoId=${VIDEO_ID} key=${S3_OBJECT_KEY} bucket=${BUCKET_NAME}"

if [[ "$SKIP_AWS" == "1" ]]; then
  : "${LOCAL_INPUT:?LOCAL_INPUT is required when SKIP_AWS=1}"
  cp "$LOCAL_INPUT" "$INPUT_FILE"
  log "download skipped, copied ${LOCAL_INPUT}"
else
  run_step "download s3://${BUCKET_NAME}/${S3_OBJECT_KEY}" \
    aws_s3 cp "s3://${BUCKET_NAME}/${S3_OBJECT_KEY}" "$INPUT_FILE"
fi

DURATION_SECONDS="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT_FILE")"
if [[ -z "$DURATION_SECONDS" || "$DURATION_SECONDS" == "N/A" ]]; then
  log "ERROR ffprobe returned no duration"
  exit 1
fi

DURATION_MS="$(awk -v d="$DURATION_SECONDS" 'BEGIN { printf "%d", (d * 1000) + 0.5 }')"
if [[ "$DURATION_MS" -le 0 ]]; then
  log "ERROR non positive duration ${DURATION_SECONDS}s"
  exit 1
fi
log "duration ${DURATION_SECONDS}s (${DURATION_MS}ms)"

run_step "encode stream.mp4" \
  ffmpeg -nostdin -y -i "$INPUT_FILE" \
  -c:v libx264 -preset medium -crf 24 \
  -g 60 -keyint_min 60 -sc_threshold 0 \
  -c:a aac -b:a 128k -movflags +faststart "$STREAM_FILE"

finish_media "$INPUT_FILE" "$STREAM_FILE"
