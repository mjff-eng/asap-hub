#!/usr/bin/env bash
set -Eeuo pipefail

# The finishing stage every job that produces a watchable video shares: sprite,
# poster, WebVTT track, the upload to media/{videoId}/ and the ready flip.
# Sourced, not executed: it uses the caller's log, run_step, aws_s3 and
# aws_dynamodb helpers and the caller's VIDEO_ID, BUCKET_NAME, TABLE_NAME,
# DURATION_MS, WORK_DIR, SKIP_AWS and SPRITE_* settings.

format_timestamp() {
  awk -v ms="$1" 'BEGIN {
    h = int(ms / 3600000); ms -= h * 3600000
    m = int(ms / 60000); ms -= m * 60000
    s = int(ms / 1000); ms -= s * 1000
    printf "%02d:%02d:%02d.%03d", h, m, s, ms
  }'
}

# $1 is sampled for the sprite tiles, $2 is the mp4 that gets uploaded
finish_media() {
  local sprite_source="$1"
  local stream_file="$2"

  SPRITE_FILE="${WORK_DIR}/sprite.jpg"
  VTT_FILE="${WORK_DIR}/thumbnails.vtt"
  THUMB_FILE="${WORK_DIR}/thumb.jpg"

  # A fixed interval gives a short demo a single tile, so the scrub preview
  # shows one frame end to end. Aim for a tile count instead, floored at one
  # second so a long demo does not grow an enormous sheet.
  if [[ -z "${SPRITE_INTERVAL_SECONDS:-}" ]]; then
    SPRITE_INTERVAL_SECONDS="$(awk -v ms="$DURATION_MS" -v t="$SPRITE_TARGET_TILES" \
      'BEGIN { i = int(((ms / 1000) + t - 1) / t); if (i < 1) i = 1; print i }')"
  fi

  # one tile per interval, ceil so the final partial interval still gets a frame
  TILE_COUNT="$(awk -v ms="$DURATION_MS" -v i="$SPRITE_INTERVAL_SECONDS" \
    'BEGIN { n = int((ms / 1000) / i); if ((ms / 1000) > n * i) n += 1; if (n < 1) n = 1; print n }')"
  COLUMNS="$SPRITE_COLUMNS"
  if [[ "$TILE_COUNT" -lt "$COLUMNS" ]]; then
    COLUMNS="$TILE_COUNT"
  fi
  ROWS="$(((TILE_COUNT + COLUMNS - 1) / COLUMNS))"
  log "sprite ${TILE_COUNT} tiles, ${COLUMNS}x${ROWS} grid at ${SPRITE_TILE_WIDTH}px wide"

  run_step "build sprite.jpg" \
    ffmpeg -nostdin -y -i "$sprite_source" \
    -frames:v 1 \
    -vf "fps=1/${SPRITE_INTERVAL_SECONDS},scale=${SPRITE_TILE_WIDTH}:-2,tile=${COLUMNS}x${ROWS}" \
    -q:v 4 "$SPRITE_FILE"

  # poster frame a quarter of the way in; a missing thumbnail must never fail the encode
  POSTER_SECONDS="$(awk -v ms="$DURATION_MS" 'BEGIN { printf "%.3f", (ms / 1000) * 0.25 }')"
  THUMB_OK=1
  run_step "build thumb.jpg at ${POSTER_SECONDS}s" \
    ffmpeg -nostdin -y -ss "$POSTER_SECONDS" -i "$stream_file" \
    -frames:v 1 -vf "scale=640:-2" -q:v 4 "$THUMB_FILE" || THUMB_OK=0
  if [[ "$THUMB_OK" == "0" ]]; then
    log "WARN could not build thumb.jpg, continuing without a poster frame"
  fi

  TILE_HEIGHT="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$SPRITE_FILE")"
  TILE_HEIGHT="$((TILE_HEIGHT / ROWS))"
  log "sprite tile height ${TILE_HEIGHT}px"

  {
    printf 'WEBVTT\n\n'
    index=0
    while [[ "$index" -lt "$TILE_COUNT" ]]; do
      start_ms=$((index * SPRITE_INTERVAL_SECONDS * 1000))
      end_ms=$(((index + 1) * SPRITE_INTERVAL_SECONDS * 1000))
      if [[ "$end_ms" -gt "$DURATION_MS" ]]; then
        end_ms="$DURATION_MS"
      fi
      x=$(((index % COLUMNS) * SPRITE_TILE_WIDTH))
      y=$(((index / COLUMNS) * TILE_HEIGHT))
      printf '%s --> %s\n' "$(format_timestamp "$start_ms")" "$(format_timestamp "$end_ms")"
      printf 'sprite.jpg#xywh=%d,%d,%d,%d\n\n' "$x" "$y" "$SPRITE_TILE_WIDTH" "$TILE_HEIGHT"
      index=$((index + 1))
    done
  } >"$VTT_FILE"
  log "wrote thumbnails.vtt"

  if [[ "$SKIP_AWS" == "1" ]]; then
    log "upload skipped, artefacts left in ${WORK_DIR}"
    log "done videoId=${VIDEO_ID} durationMs=${DURATION_MS}"
    exit 0
  fi

  MEDIA_PREFIX="s3://${BUCKET_NAME}/media/${VIDEO_ID}"

  run_step "upload stream.mp4" \
    aws_s3 cp "$stream_file" "${MEDIA_PREFIX}/stream.mp4" \
    --content-type video/mp4
  run_step "upload sprite.jpg" \
    aws_s3 cp "$SPRITE_FILE" "${MEDIA_PREFIX}/sprite.jpg" \
    --content-type image/jpeg
  run_step "upload thumbnails.vtt" \
    aws_s3 cp "$VTT_FILE" "${MEDIA_PREFIX}/thumbnails.vtt" \
    --content-type text/vtt
  if [[ "$THUMB_OK" == "1" ]]; then
    run_step "upload thumb.jpg" \
      aws_s3 cp "$THUMB_FILE" "${MEDIA_PREFIX}/thumb.jpg" \
      --content-type image/jpeg ||
      log "WARN could not upload thumb.jpg, continuing"
  fi

  run_step "mark VIDEO#${VIDEO_ID} ready" \
    aws_dynamodb update-item \
    --table-name "$TABLE_NAME" \
    --key "{\"PK\":{\"S\":\"VIDEO#${VIDEO_ID}\"},\"SK\":{\"S\":\"META\"}}" \
    --update-expression 'SET durationMs = :durationMs, processingState = :state REMOVE processingError' \
    --condition-expression 'attribute_exists(PK)' \
    --expression-attribute-values \
    "{\":durationMs\":{\"N\":\"${DURATION_MS}\"},\":state\":{\"S\":\"ready\"}}"

  log "done videoId=${VIDEO_ID} durationMs=${DURATION_MS}"
}
