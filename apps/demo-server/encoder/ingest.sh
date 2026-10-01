#!/usr/bin/env bash
set -Eeuo pipefail

: "${VIDEO_ID:?VIDEO_ID is required}"
: "${ASSET_ID:?ASSET_ID is required}"
: "${ASSET_KEY:?ASSET_KEY is required}"
: "${BUCKET_NAME:?BUCKET_NAME is required}"
: "${TABLE_NAME:?TABLE_NAME is required}"

# logging, the aws wrappers, json escaping and the failure trap
# shellcheck source=common.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

WORK_DIR="${WORK_DIR:-/scratch}"
PROXY_KEY="projects/${VIDEO_ID}/assets/${ASSET_ID}/proxy.mp4"
ITEM_KEY_JSON="{\"PK\":{\"S\":\"VIDEO#${VIDEO_ID}\"},\"SK\":{\"S\":\"ASSET#${ASSET_ID}\"}}"

report_failure() {
  local message="$1"
  if [[ "$FAILURE_REPORTED" == "1" ]]; then
    return
  fi
  FAILURE_REPORTED=1
  log "FAILED $message"
  # the condition keeps a delete that raced the ingest from resurrecting the item
  aws_dynamodb update-item \
    --table-name "$TABLE_NAME" \
    --key "$ITEM_KEY_JSON" \
    --update-expression 'SET #state = :state, #error = :error, #updatedAt = :updatedAt' \
    --condition-expression 'attribute_exists(PK)' \
    --expression-attribute-names '{"#state":"state","#error":"error","#updatedAt":"updatedAt"}' \
    --expression-attribute-values \
    "{\":state\":{\"S\":\"failed\"},\":error\":{\"S\":$(json_string "${message:0:500}")},\":updatedAt\":{\"S\":\"$(now)\"}}" \
    >/dev/null || log "WARN could not record the failure on ASSET#${ASSET_ID}"
}

JOB_SCRIPT='ingest.sh'
install_failure_trap

probe_duration_ms() {
  local seconds
  seconds="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" || true)"
  if [[ -z "$seconds" || "$seconds" == "N/A" ]]; then
    printf '0'
    return
  fi
  awk -v d="$seconds" 'BEGIN { printf "%d", (d * 1000) + 0.5 }'
}

stream_value() {
  printf '%s\n' "$STREAM_INFO" | awk -F= -v key="$1" '$1 == key { print $2; exit }'
}

mkdir -p "$WORK_DIR"
INPUT_FILE="${WORK_DIR}/asset"
PROXY_FILE="${WORK_DIR}/proxy.mp4"

log "start videoId=${VIDEO_ID} assetId=${ASSET_ID} key=${ASSET_KEY}"

run_step "download s3://${BUCKET_NAME}/${ASSET_KEY}" \
  aws_s3 cp "s3://${BUCKET_NAME}/${ASSET_KEY}" "$INPUT_FILE"

STREAM_INFO="$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 "$INPUT_FILE" || true)"
FORMAT_NAME="$(ffprobe -v error -show_entries format=format_name -of csv=p=0 "$INPUT_FILE" || true)"

# the render mixes every clip into one uniform audio layout, so it has to know
# which sources carry a track at all
AUDIO_CODEC="$(ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name -of csv=p=0 "$INPUT_FILE" || true)"
HAS_AUDIO=false
if [[ -n "$AUDIO_CODEC" && "$AUDIO_CODEC" != "N/A" ]]; then
  HAS_AUDIO=true
fi

CODEC_NAME="$(stream_value codec_name)"
WIDTH="$(stream_value width)"
HEIGHT="$(stream_value height)"
FRAME_RATE="$(stream_value r_frame_rate)"
[[ "$WIDTH" =~ ^[0-9]+$ ]] || WIDTH=0
[[ "$HEIGHT" =~ ^[0-9]+$ ]] || HEIGHT=0

# r_frame_rate is a fraction, 60000/1001 is the 59.94 that belongs on a 60fps timeline
FPS="$(awk -v r="${FRAME_RATE:-0}" 'BEGIN {
  split(r, parts, "/")
  den = (parts[2] == "" ? 1 : parts[2])
  if (den == 0) { print 0 } else { printf "%d", (parts[1] / den) + 0.5 }
}')"

DURATION_MS="$(probe_duration_ms "$INPUT_FILE")"
log "probed codec=${CODEC_NAME:-none} format=${FORMAT_NAME:-unknown} ${WIDTH}x${HEIGHT} ${FPS}fps ${DURATION_MS}ms audio=${HAS_AUDIO}"

# the proxy is only ever scrubbed in a browser, and the capture now films 4K on
# a machine that can sustain it, so it is capped at the editing canvas: the
# render reads the original and never the proxy, so the export loses nothing
PROXY_MAX_WIDTH=1920
PROXY_MAX_HEIGHT=1080
# min() leaves a smaller source alone rather than upscaling it, decrease keeps
# the aspect, and force_divisible_by=2 is what yuv420p needs: without it a
# 3024x1964 source fits to an odd 1663 wide and libx264 refuses it
PROXY_SCALE="scale='min(${PROXY_MAX_WIDTH},iw)':'min(${PROXY_MAX_HEIGHT},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"

# a copy is two orders of magnitude cheaper than an encode, so it is still worth
# taking, but only for a source we have measured to be inside the cap already:
# copying an oversized one through is exactly what the cap is here to stop, and
# a source whose size would not probe cannot be shown to fit
WITHIN_PROXY_CAP=false
if [[ "$WIDTH" -gt 0 && "$HEIGHT" -gt 0 &&
  "$WIDTH" -le "$PROXY_MAX_WIDTH" && "$HEIGHT" -le "$PROXY_MAX_HEIGHT" ]]; then
  WITHIN_PROXY_CAP=true
fi

# the editor seeks the proxy, so it is always a faststart mp4: MediaRecorder WebM
# carries neither a duration nor cues, and even an mp4 may not be faststart
if [[ -z "$CODEC_NAME" ]]; then
  run_step "remux audio only proxy.mp4" \
    ffmpeg -nostdin -y -i "$INPUT_FILE" \
    -vn -c:a aac -b:a 128k -movflags +faststart "$PROXY_FILE"
elif [[ "$CODEC_NAME" == "h264" && "$WITHIN_PROXY_CAP" == "true" &&
  ("$FORMAT_NAME" == *mp4* || "$FORMAT_NAME" == *mov*) ]]; then
  run_step "copy proxy.mp4" \
    ffmpeg -nostdin -y -i "$INPUT_FILE" \
    -c copy -movflags +faststart "$PROXY_FILE"
else
  run_step "transcode proxy.mp4 within ${PROXY_MAX_WIDTH}x${PROXY_MAX_HEIGHT}" \
    ffmpeg -nostdin -y -i "$INPUT_FILE" \
    -vf "$PROXY_SCALE" \
    -c:v libx264 -preset veryfast -crf 24 \
    -c:a aac -b:a 128k -movflags +faststart "$PROXY_FILE"
fi

if [[ "$DURATION_MS" -le 0 ]]; then
  DURATION_MS="$(probe_duration_ms "$PROXY_FILE")"
  log "source carried no duration, proxy reports ${DURATION_MS}ms"
fi
if [[ "$DURATION_MS" -le 0 ]]; then
  log "ERROR no duration on the source or the proxy"
  exit 1
fi

run_step "upload proxy.mp4" \
  aws_s3 cp "$PROXY_FILE" "s3://${BUCKET_NAME}/${PROXY_KEY}" \
  --content-type video/mp4

UPDATE_SET='SET #state = :state, #proxyKey = :proxyKey, #durationMs = :durationMs, #hasAudio = :hasAudio, #updatedAt = :updatedAt'
UPDATE_NAMES='"#state":"state","#proxyKey":"proxyKey","#durationMs":"durationMs","#hasAudio":"hasAudio","#updatedAt":"updatedAt","#error":"error"'
UPDATE_VALUES="\":state\":{\"S\":\"ready\"},\":proxyKey\":{\"S\":\"${PROXY_KEY}\"},\":durationMs\":{\"N\":\"${DURATION_MS}\"},\":hasAudio\":{\"BOOL\":${HAS_AUDIO}},\":updatedAt\":{\"S\":\"$(now)\"}"

if [[ "$WIDTH" -gt 0 && "$HEIGHT" -gt 0 ]]; then
  UPDATE_SET="${UPDATE_SET}, #width = :width, #height = :height"
  UPDATE_NAMES="${UPDATE_NAMES},\"#width\":\"width\",\"#height\":\"height\""
  UPDATE_VALUES="${UPDATE_VALUES},\":width\":{\"N\":\"${WIDTH}\"},\":height\":{\"N\":\"${HEIGHT}\"}"
fi
if [[ "$FPS" -gt 0 ]]; then
  UPDATE_SET="${UPDATE_SET}, #fps = :fps"
  UPDATE_NAMES="${UPDATE_NAMES},\"#fps\":\"fps\""
  UPDATE_VALUES="${UPDATE_VALUES},\":fps\":{\"N\":\"${FPS}\"}"
fi

run_step "mark ASSET#${ASSET_ID} ready" \
  aws_dynamodb update-item \
  --table-name "$TABLE_NAME" \
  --key "$ITEM_KEY_JSON" \
  --update-expression "${UPDATE_SET} REMOVE #error" \
  --condition-expression 'attribute_exists(PK)' \
  --expression-attribute-names "{${UPDATE_NAMES}}" \
  --expression-attribute-values "{${UPDATE_VALUES}}"

log "done videoId=${VIDEO_ID} assetId=${ASSET_ID} durationMs=${DURATION_MS}"
