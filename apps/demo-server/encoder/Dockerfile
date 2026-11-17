FROM public.ecr.aws/docker/library/alpine:3.20

# nodejs, librsvg (rsvg-convert) and a font are what the render job needs to turn
# a timeline into overlay frames; ffmpeg and the aws cli are what every job needs
RUN apk add --no-cache \
  bash \
  ffmpeg \
  aws-cli \
  coreutils \
  nodejs \
  rsvg-convert \
  fontconfig \
  font-dejavu \
  font-roboto

# a missing binary should fail the build, not the first render that needs it
RUN for tool in bash ffmpeg ffprobe aws node rsvg-convert; do \
  command -v "$tool" >/dev/null || { echo "missing $tool"; exit 1; }; \
  done

COPY entrypoint.sh common.sh encode.sh finish.sh ingest.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/encode.sh \
  /usr/local/bin/ingest.sh

# the render job is one esbuild bundle of encoder/render.ts, so the container
# builds a timeline with the very same code the browser previews it with.
# `yarn workspace @asap-hub/demo-server build:encoder` writes it before a build
COPY dist/render.js /usr/local/lib/encoder/render.js

WORKDIR /scratch

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
