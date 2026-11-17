# Demo Hub Studio: from "upload + titles" to a screen.studio-style editor

> Living document. It is edited whenever a finding changes the approach or the milestone order, and
> the reason is recorded in [FINDINGS.md](./FINDINGS.md). Day to day progress lives in
> [PROGRESS.md](./PROGRESS.md).

## Context

The demo hub (`apps/demo-frontend` + `apps/demo-server`) already shares demos well: a library with
folders, a custom player with chapters and sprite scrubbing, invite-first access, draft/publish.
Creation is the weak half. Today a creator can only upload one finished file and mark chapters
(`pages/StudioUpload.tsx`, `pages/StudioVideo.tsx`), so the polish in the reference screenshots
(banner captions over the video, full-screen title cards between sections, cursor highlights, zoom)
has to be produced in an external tool before upload.

The goal is to make the hub the place demos are _made_: record in-app or import, assemble multiple
clips on a timeline, add title cards, banners, voice-over, cursor effects and zoom, then render one
normal MP4 that the existing Watch page plays with no changes. Members keep watching a plain video
with chapters; all the complexity stays on the creation side.

Decisions already taken with the product owner:

- Mouse data comes from a **companion JS snippet** run on the site being demoed, and captured cursor
  events must stay **manually editable** afterwards.
- Sources stay hot for **90 days, then archive** to Glacier IR (re-editing after that needs a restore).
- Build order starts with the **timeline foundation**, not recording.
- Title cards and banners use **presets with light per-item overrides**, not a full styling panel.
- Output is a progressive MP4, **1080p minimum**.

## Architecture in one page

Four ideas carry the whole design:

1. **The `Video` row stays the unit of library, publish and watch.** Nothing about Home, Watch,
   folders, chapters, publish or the player changes. A studio video is just a `Video` whose pixels
   come from a render instead of a direct upload (`kind: 'upload' | 'studio'`).
2. **The timeline document lives in S3, not DynamoDB.** The item is capped at 400KB and a timeline
   with a cursor path is bigger than that. DynamoDB keeps a pointer plus a version; S3 keeps
   immutable per-version JSON, which also gives cheap history.
3. **One shared domain package** (`packages/demo-timeline`) holds the types, zod schemas and every
   pure function: timeline math, effect derivation, banner/title SVG generation, ffmpeg filtergraph
   construction. The editor, the server and the renderer all import the same code, so preview and
   output cannot drift apart by accident.
4. **All heavy work runs in the existing Fargate container**, never in the 16s Lambda. Ingest
   (normalise a source to a seekable proxy) and render (compose the timeline) are two new entrypoints
   next to today's `encode.sh`, sharing its finishing stage.

## Domain model

### Where things live

| Thing                                          | Storage                                                             | Why                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Video metadata, chapters, publish state        | DynamoDB `VIDEO#{id}` / `META` (unchanged)                          | Watch and library already read it                        |
| Timeline document                              | S3 `projects/{videoId}/timeline-{version}.json`                     | Too big for an item; immutable versions give history     |
| Timeline pointer + version + hash              | New attributes on the video item                                    | Optimistic concurrency, same as `version` today          |
| Source assets (recordings, imports, narration) | S3 `projects/{videoId}/assets/{assetId}/original.*` and `proxy.mp4` | Outside `raw/`, so the existing encoder rule never fires |
| Asset metadata                                 | DynamoDB `VIDEO#{id}` / `ASSET#{assetId}`                           | Small, queryable, cascade-deletes with the video         |
| Raw cursor event stream                        | S3 `projects/{videoId}/capture/{sessionId}.json`                    | Bulk, immutable, re-derivable                            |
| Rendered output                                | S3 `media/{videoId}/…` (unchanged)                                  | Watch page needs zero changes                            |

Key layout matters: everything the studio writes sits under `projects/`, outside `raw/`, so the `EncoderRule` in
`serverless.ts` (prefix `raw/`) does not fire one Fargate task per recorded segment.

### The timeline document

`packages/demo-timeline/src/schema.ts`, versioned with `schemaVersion` and migrated by a small
`migrateTimeline(doc)` chain so old projects keep opening.

```ts
type TimelineDoc = {
  schemaVersion: 1;
  canvas: { width: number; height: number; fps: 30 }; // 1920x1080 default
  clips: Clip[]; // ordered, the video track; gaps are not allowed
  banners: Banner[]; // overlay track, absolute times on the rendered timeline
  narration: NarrationClip[]; // audio track
  zooms: Zoom[]; // effects track, clip-anchored
  cursor: CursorLayer[]; // one per source clip that has captured data
  chapters: ChapterMarker[]; // clip-anchored, resolved to video.chapters at render
};

type Clip =
  | {
      kind: 'source';
      id: string;
      assetId: string;
      inMs: number;
      outMs: number;
      transitionIn?: Transition;
      volume: number;
    }
  | {
      kind: 'title';
      id: string;
      durationMs: number;
      preset: TitlePresetId;
      text: string;
      subtitle?: string;
      transitionIn?: Transition;
    };

type Transition = { type: 'cut' | 'crossfade' | 'slide'; durationMs: number };
type Banner = {
  id: string;
  startMs: number;
  durationMs: number;
  preset: BannerPresetId;
  text: string;
  subtitle?: string;
  position: 'bottom' | 'top';
  animation: 'fade' | 'slide';
};
type Zoom = {
  id: string;
  clipId: string; // clip-anchored, times below are clip-local
  startMs: number;
  rampInMs: number;
  holdMs: number;
  rampOutMs: number;
  focus: { x: number; y: number };
  scale: number;
  easing: 'linear' | 'easeInOut';
};
type ChapterMarker = {
  id: string;
  clipId: string;
  offsetMs: number;
  title: string;
};
type CursorEffect = {
  id: string;
  tMs: number;
  type: 'ripple' | 'spotlight' | 'zoom';
  point: { x: number; y: number };
  origin: 'derived' | 'derived-edited' | 'manual';
  sourceEventId?: string;
};
type CursorLayer = {
  clipId: string;
  offsetMs: number; // manual sync nudge
  path: { tMs: number; x: number; y: number }[]; // 10Hz resample
  effects: CursorEffect[];
};
```

All times are milliseconds, matching `Chapter.startMs` and `durationMs` today. Coordinates are
normalised 0..1 against the source frame so they survive scaling. Zooms, cursor layers and chapter
markers carry a `clipId` and clip-local times, so reordering, trimming and splitting carry them
along; banners stay program-anchored because a banner may deliberately span a transition.

**Cursor events stay editable.** The raw stream in S3 is never mutated. Importing it runs
`deriveCursorEffects(events, options)` (pure, unit-tested) which produces `CursorEffect[]` and the
resampled `path`, both written into the timeline as ordinary editable items. Each derived effect
keeps `sourceEventId`; editing one flips it to `derived-edited`. Re-deriving replaces `derived`
items only and leaves `derived-edited` and `manual` untouched. The renderer reads the timeline
effects and never sees the raw stream.

### New DynamoDB attributes on the video item

`kind`, `timelineKey`, `timelineVersion`, `timelineHash`, `renderState`
(`idle | queued | rendering | failed`), `renderJobId`, `renderProgress`, `renderStage`, `renderError`.
`serialiseVideo` in `apps/demo-server/src/routes/videos.ts:26` gains the render fields.

Note the trap found during exploration: `PATCH /videos/:id` builds a **hand-written**
`UpdateExpression` (`videos.ts:307`), so new editable attributes must be added there, not just to the
ElectroDB entity. The plan deliberately avoids touching it by giving the timeline its own endpoint.

## Server changes (`apps/demo-server`)

New and changed routes, all `requireCreator`, all zod-validated in `src/schemas.ts`:

| Endpoint                                                                                      | Purpose                                                                                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/projects`                                                                          | Create a studio video (`kind: 'studio'`) with an empty timeline, no upload attached             |
| `GET /api/videos/:id/timeline`                                                                | Signed-URL or inline JSON fetch of the current timeline                                         |
| `PUT /api/videos/:id/timeline`                                                                | Write a new timeline version: S3 put, then conditional item update on lease + `timelineVersion` |
| `POST /api/videos/:id/assets`                                                                 | Open a multipart upload for one source asset, returns `{assetId, uploadId, partSize}`           |
| `POST /api/videos/:id/assets/:assetId/complete`                                               | Finish the upload, then `ecs:RunTask` the ingest job                                            |
| `DELETE /api/videos/:id/assets/:assetId`                                                      | Remove an unused asset                                                                          |
| `POST /api/videos/:id/render`                                                                 | Snapshot the timeline version, set `renderState: 'queued'`, `ecs:RunTask` the render job        |
| `DELETE /api/videos/:id/render`                                                               | `ecs:StopTask` and clear render state                                                           |
| `POST /api/recordings` / `POST /api/recordings/:id/events` / `GET /api/recordings/:id/events` | Cursor capture session (see below)                                                              |

The uploads flow today couples "create the video row" with "open the multipart upload"
(`routes/uploads.ts`). Refactor: extract `openMultipartUpload(key)` and reuse it from both
`POST /uploads` (unchanged behaviour, unchanged response) and the new asset endpoint. The part-signing
guard (`processingState === 'uploading'`) becomes a per-asset check on the ASSET item.

`deleteVideoCascade` (`routes/cascade.ts`) additionally deletes `projects/{id}/`
and the ASSET items.

**Lease semantics.** Editing keeps today's 90s lease and 30s heartbeat unchanged
(`useEditLease.ts`). Rendering does not need the lease: `POST /render` records which
`timelineVersion` it snapshotted, so a creator may keep editing while a render runs, and the result
is labelled with the version it came from.

## Frontend changes (`apps/demo-frontend`)

`pages/StudioVideo.tsx` is 838 lines today and must not be the template. The editor is decomposed:

```
src/studio/
  project/        useProject.ts, useProjectAutosave.ts, timelineReducer.ts, undo.ts
  timeline/       Timeline.tsx, TrackHeaders.tsx, ClipTrack.tsx, BannerTrack.tsx,
                  AudioTrack.tsx, EffectTrack.tsx, Playhead.tsx, dragging.ts
  preview/        PreviewStage.tsx, ClipVideo.tsx, BannerLayer.tsx, TitleCard.tsx,
                  ZoomLayer.tsx, CursorLayer.tsx, usePlayback.ts
  inspector/      Inspector.tsx + one panel per item type
  assets/         AssetPanel.tsx, useAssetUpload.ts, ingestState.ts
  recording/      (M3) useScreenRecorder.ts, RecorderPanel.tsx, segments.ts
  cursor/         (M4) useRecordingSession.ts, snippet.ts
```

State: one `timelineReducer` over the document, with undo/redo as capped past/present/future
document stacks (`undo.ts`). Server state stays in React Query. Autosave reuses the proven pattern
from `StudioVideo.tsx`: 1.5s debounce, single in-flight write, 409-rebase on conflict, `readOnly`
when the lease is not held.

**Preview engine: DOM and CSS, not canvas.** A pooled `<video>` per clip (current plus preloaded
next), CSS `transform` for zoom and pan, absolutely positioned DOM for banners, title cards and
cursor effects. It is simpler, GPU-accelerated, needs no per-frame JavaScript, and styles with the
existing `--demo-*` tokens so dark mode keeps working. Fidelity between preview and render is
guaranteed structurally: banners and title cards are generated as **SVG by shared code**
(`packages/demo-timeline/src/presets/`), inlined in the browser and rasterised in the container, so
one module defines the look for both.

New UI primitives are needed and belong in `src/ui/` alongside the existing kit: `Slider`, `Tabs`,
`Tooltip`, `NumberField`, `Popover`. Scrubbing math is reused from `src/watch/playback.ts` and the
pointer-capture pattern in `src/watch/SeekBar.tsx`.

## Studio layout and UX

The current studio is a single scrolling form, which will not carry an editor. The layout is
redesigned (and the surrounding flows adjusted where they get in the way):

- **Editor shell**: a fixed, non-scrolling three-pane workspace. Left rail for assets and the
  recorder, centre for the preview stage with transport controls under it, right for the contextual
  inspector, and a full-width timeline docked along the bottom with its own zoom and per-track
  headers. Panels are resizable and their sizes persist in `localStorage`, matching how
  `demo-hub.library.view` is already stored.
- **Entry point**: `/studio/upload` becomes a single "New demo" flow offering _record_ or _import_,
  so creators start the same way regardless of source. The existing import path stays intact
  underneath it.
- **Library**: cards show whether a demo is a studio project or a plain upload, and surface render
  state and progress inline instead of only the processing spinner.
- **Watch**: unchanged by default. The only optional addition is a chapter list already present.

Everything uses the existing `--demo-*` tokens so light and dark keep working, and new primitives
(`Slider`, `Tabs`, `Tooltip`, `NumberField`, `Popover`) are added to `src/ui/` rather than being
hand-rolled per panel.

## Render pipeline

Trigger by explicit `ecs:RunTask` from the Lambda, not by an S3 object plus EventBridge: it returns a
job id immediately, supports cancellation via `StopTask`, and cannot collide with the `raw/` rule.
The Lambda role needs `ecs:RunTask` and `iam:PassRole` added in `serverless.ts`.

The container gains Node plus two entrypoints beside `encode.sh`:

- `ingest.mjs`: probe the uploaded source, remux or transcode to a seekable `proxy.mp4`
  (MediaRecorder WebM has no duration or cues, so the editor must never seek the original), write
  duration and dimensions onto the ASSET item.
- `render.mjs`: build the output from the timeline.

`render.mjs` is a thin shell around pure functions in `packages/demo-timeline/src/render/`, which is
what makes it testable:

1. Normalise each clip to an intermediate MP4: trim (`-ss`/`-to`), `scale` and `pad` to the canvas,
   fps normalise, apply zoom and pan (`scale` + `crop` driven by time expressions), burn cursor
   effects (`overlay` with `enable='between(t,…)'`).
2. Rasterise title cards and banners: shared preset code emits SVG, `rsvg-convert` makes PNG.
3. Concatenate with transitions (`xfade`), which requires the uniform resolution and fps from step 1.
4. Overlay banners with `fade` for entry and exit animation.
5. Mix audio: clip audio plus narration with `adelay` and `amix`.
6. Final encode at 1080p minimum (`scale` up if the source is smaller), `libx264 -crf 21 -preset
medium -g 60 -movflags +faststart`.
7. Hand off to the **shared finishing stage** extracted from today's `encode.sh` into `finish.sh`:
   sprite, `thumbnails.vtt`, poster, upload to `media/{id}/`, flip `processingState` to `ready`.

Intermediate files per clip keep each filtergraph small and debuggable, at the cost of disk, so
Fargate ephemeral storage must be raised (100GB) alongside the existing 4 vCPU / 8GB.

Progress: the renderer updates `renderProgress` and `renderStage` per stage; the frontend already
polls while processing. Idempotency: the renderer only writes state if `renderJobId` still matches,
so a superseded render cannot clobber a newer one.

Chapters for studio videos are derived from title cards plus manual markers and written to the video
item at render time, so the Watch page keeps reading `chapters` exactly as it does now.

## Recording and the cursor snippet

Screen capture uses `getDisplayMedia({ video: { frameRate: 30, width: 1920, height: 1080 } })` with
`getUserMedia` for the mic, recorded by `MediaRecorder` preferring `video/webm;codecs=vp9,opus` and
falling back to vp8 then h264. Takes can be a single run or several segments; each finished segment
uploads as one asset and lands as a clip on the timeline. v1 buffers chunks and uploads on stop; the
asset API is shaped so streaming uploads can be added later without changing it.

The companion snippet posts batched pointer and click events to a short-lived, token-scoped
recording-session endpoint (a CORS-open route, token in the URL, no Auth0 needed since the snippet
runs on another origin). This is navigation-proof and works from a bookmarklet on any site, unlike
`window.opener` postMessage. Both tabs run on the creator's machine, so `Date.now()` is directly
comparable; the only real offset is capture-start latency, corrected by the per-layer `offsetMs`
nudge in the editor.

## Milestones

Each is independently shippable.

- **M0 Foundations.** `packages/demo-timeline` package wired into vite, jest and the server build;
  project and asset entities; decoupled upload; ingest job producing proxies; the `projects/` key
  layout; lifecycle rules (90 day hot, then Glacier IR); studio route skeleton.
- **M1 Timeline and render** (first shippable studio). Import several videos, trim, split, reorder,
  DOM preview, autosave, server render with concat at 1080p, publish. Chapters still hand-marked.
- **M2 Text and transitions.** Title cards and banners from the shared SVG presets, transitions
  (`xfade`), auto-chapters from title cards.
- **M3 Recording and voice-over.** In-app screen recording, multi-segment takes, mic capture,
  narration recorded over the timeline, audio mixing in the render.
- **M4 Cursor and zoom**, in two halves because the capture half depends on the manual half:
  - **M4a** the editable effect model itself: manual zoom keyframes with smooth pan, hand-placed
    click highlights and spotlight, the effects track and its inspector.
  - **M4b** the companion snippet, recording sessions, derivation of effects from captured events,
    the re-derive merge that preserves hand edits, and the offset nudge.

The M4 split is deliberate: captured events must land in the same editable model as the manual
fallback, so that model has to exist and render correctly before anything derives into it.

## Local environment equals production

The local setup must exercise the same code paths as the deployed one, so a feature verified locally
is genuinely verified. Today it does not: uploads locally run `src/local-encoder.ts`, a second
implementation of the ffmpeg work that can drift from `encoder/encode.sh`.

The fix is a **job runner abstraction** with two implementations behind one interface
(`src/jobs/runner.ts`):

```ts
type JobName = 'ingest' | 'render' | 'encode';
type JobRunner = {
  run(job: JobName, env: Record<string, string>): Promise<{ jobId: string }>;
  stop(jobId: string): Promise<void>;
};
```

- Deployed: `EcsJobRunner` calls `ecs:RunTask` / `ecs:StopTask` with container overrides.
- Local: `DockerJobRunner` runs `docker run` on the **same image** built from `encoder/Dockerfile`,
  pointed at MinIO and DynamoDB Local.

This works because `encode.sh` already wraps the AWS CLI with `S3_ENDPOINT` and `DYNAMODB_ENDPOINT`
overrides, so the container runs unmodified against the local stack. `docker-compose.yml` gains the
encoder image as a build target, and `yarn demo:local:setup` builds it. The same ffmpeg commands, the
same S3 layout, the same DynamoDB state transitions run in both environments; only the dispatcher
differs. `local-encoder.ts` is kept only as a no-Docker fallback for the legacy upload path and is no
longer the primary local route.

Remaining unavoidable differences, all documented in the studio README: CloudFront signed cookies are
a no-op locally (media is proxied by Express), SES emails are logged not sent, and MinIO answers
`PutBucketCors` with 501. Everything else, including the render pipeline, behaves identically.

Local blocker to clear first: another project's container currently owns ports 9000 and 9001 on this
machine, so the hub's MinIO starts with no published ports and media cannot load.

## Progress tracking and a living plan

Work is incremental, and the plan is expected to change as reality pushes back. Three documents live
in the repo under `docs/demo-studio/` and are updated as part of the work, not afterwards:

- `PLAN.md`: this plan, kept current. When a finding changes priorities, the milestone order is
  edited here and the reason recorded.
- `PROGRESS.md`: the running log. One section per milestone with a task checklist and acceptance
  criteria, plus a dated entry per working session saying what landed, what was verified and what
  moved.
- `FINDINGS.md`: issues and discoveries, each with a severity that drives replanning:
  - **P0 blocker**: stops the current milestone. Work stops, the plan is re-ordered immediately.
  - **P1 must-fix**: ships before the next milestone starts.
  - **P2 backlog**: recorded with enough detail to pick up later, does not interrupt.

Every finding entry records what was observed, why it matters, and the decision taken, so nothing is
silently dropped. Each milestone closes only when its acceptance criteria in `PROGRESS.md` are
checked off and its `P0`/`P1` findings are resolved.

## Testing

- Pure functions in `packages/demo-timeline`: timeline math, effect derivation, SVG preset snapshots,
  **ffmpeg filtergraph snapshot tests** (the highest-value tests in the whole plan).
- `timelineReducer` and `undo` as plain reducer tests.
- Editor components with the existing `renderApp` harness and injected `Partial<Api>`; recording
  tested with stubbed `getDisplayMedia`/`MediaRecorder`, mirroring how `upload.ts` injects `put`/`wait`.
- Server routes with supertest and the injected document client, as `test/videos-*.test.ts` does now.
- Renderer: pure builder tests always, plus an ffmpeg smoke test that skips when the binary is absent
  (the pattern in `test/local-encoder.test.ts`).

Per the repo convention, scope every run to the touched file with `--testPathPattern` and
`--runInBand`, never a whole workspace.

## Risks and mitigations

| Risk                                           | Mitigation                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Browser codec variance for `MediaRecorder`     | Feature-detect a preferred list, document Chrome as the supported recorder, ingest normalises everything to MP4 anyway |
| WebM without duration or cues cannot be seeked | The editor only ever previews the ingested `proxy.mp4`, never the original                                             |
| 16s Lambda timeout                             | Every long operation is a Fargate task; Lambda only signs, writes JSON and calls `RunTask`                             |
| DynamoDB 400KB item cap                        | Timeline and cursor data live in S3, item holds a pointer                                                              |
| `raw/` EventBridge rule firing per segment     | One new prefix (`projects/`) plus explicit `RunTask`                                                                   |
| Filtergraph complexity and render time         | Per-clip intermediates instead of one giant graph; snapshot-tested builder                                             |
| Font licensing for burned-in text              | Bundle OFL-licensed fonts in the image and load the same faces via `@font-face`                                        |
| Preview and render drift                       | Shared SVG preset module is the single source of truth for text layout                                                 |
| Storage cost of keeping sources                | 90 day hot then Glacier IR, per the product owner's choice                                                             |

## Infrastructure changes (product owner deploys)

All in `apps/demo-server/serverless.ts`, implemented in code but requiring his AWS deploy:
lifecycle rules for `projects/`; Fargate `EphemeralStorage` raised to 100GB;
`ecs:RunTask` and `iam:PassRole` on the Lambda role; `s3:GetObject` on `projects/*`
plus `dynamodb:GetItem` on the task role; a CORS-open route for the cursor session endpoint (M4).

## Verification

Automated, per milestone:

- `yarn workspace @asap-hub/demo-frontend test --testPathPattern <file> --runInBand`, and the same
  for `@asap-hub/demo-server` and the new package.
- `yarn fix:format`, `yarn typecheck`, `yarn lint` from the repo root before each commit.

Manual, against the local stack (`docker compose up -d`, `yarn demo:local:setup`, `yarn start:demo`),
which now runs the same container as production. Every feature gets an explicit pass, recorded in
`PROGRESS.md`:

| Area          | What must be true                                                                             |
| ------------- | --------------------------------------------------------------------------------------------- |
| Regression    | Import a single file, set title and chapters, publish, watch: identical to today              |
| Assets        | Import several clips, see proxies ingest, delete an unused asset                              |
| Timeline      | Trim, split, reorder, undo and redo, autosave survives reload, lease blocks a second editor   |
| Render        | Render, watch progress, output is at least 1080p, chapters and sprite scrubbing work on Watch |
| Text          | Title card between clips and a banner over the video match the preview in the output          |
| Transitions   | Crossfade and slide render without artefacts at the joins                                     |
| Recording     | Screen recording, multi-segment take, pause and resume, mic captured                          |
| Voice-over    | Narration recorded over the timeline, mixed at the right level in the output                  |
| Cursor        | Snippet captures clicks, effects are editable (move, retime, delete, add), offset nudge works |
| Zoom          | Manual keyframe and auto-zoom from a click, smooth pan, no jitter in the render               |
| Failure paths | Render failure surfaces an error, cancel works, a deleted video cleans up all prefixes        |

The end-to-end acceptance run is a real demo of the ASAP hub recorded in the studio, edited with
title cards, banners, voice-over and cursor effects, rendered, published, and watched by a member
account.

Deployment readiness is verified at the end of each milestone by confirming the local run used the
production code path (container job runner, not the fallback) and by listing any `serverless.ts`
changes the product owner needs to deploy.

## Implementation notes locked in

Details that are easy to lose and expensive to discover late. Each is settled; the milestone that
consumes it is named.

**Clip-anchored effects (M0, done).** Zoom keyframes, cursor layers and chapter markers carry a
`clipId` and clip-local times rather than absolute program times, so reordering, trimming and
splitting carry them along instead of silently desynchronising them. Banners stay program-anchored
because a banner may deliberately span a transition.

**Versioned render output (M1).** The render writes `media/{videoId}/r{n}/` and the item records
which revision is live. CloudFront caches `/media/*` for a day, so overwriting `stream.mp4` on a
re-render would hide the new cut from members until the TTL expired. Versioned directories cost
nothing, are atomic, cache forever and give a free rollback. `POST /videos/:id/access` composes the
current revision into the URLs, which is why the Watch page still needs no change.

**Constant frame rate on every clip (M1).** Screen recordings from `MediaRecorder` are heavily
variable frame rate, and `concat` or `xfade` over a variable-frame-rate source drifts audio out of
sync. Every per-clip intermediate is encoded with `-fps_mode cfr -r <canvas fps>`.

**Zoom uses `zoompan`, not `crop` (M4a).** A filtergraph fixes `crop`'s output size once at
configuration time, so an animated zoom level cannot be expressed with `crop` alone. `zoompan`
evaluates `z`, `x` and `y` per output frame against `ot`. Pre-scale the input, and omit the zoom
branch entirely for clips without keyframes so the common case pays nothing.

**Audio mixing needs `amix=normalize=0` (M3).** Left at its default, `amix` quietly attenuates every
input by one over the number of inputs, which sounds like a bug in the voice-over feature.

**Text rendering: SVG for banners and title cards, ASS for click ripples (M2, M4a).** Banners and
title cards are generated as SVG by shared preset code, inlined in the browser preview and rasterised
in the container, which makes preview and output the same artwork by construction. Click ripples are
an expanding, fading ring, which is per-frame animation that a static overlay cannot express, so they
are emitted as ASS drawings and burned in with libass (already linked into ffmpeg).

**Bridge for existing uploads (M1).** `raw/` expires after 30 days, so converting an existing upload
into a project copies its source into `projects/{id}/assets/` first, server side, and carries its
chapters across.

**Collapse the triplicated update expression (M0/M1).** `PATCH /videos/:id`, `/publish` and
`/unpublish` each hand-roll the same lease-and-version conditional update. Extract one tested
`guardedUpdate({ set, remove, expectedVersion })` helper and express all three through it, so future
attributes are one map entry instead of a five-place edit.

**Recording never uses `requestAnimationFrame` (M3).** The studio tab is in the background for the
whole recording, because the creator is on the tab being demoed. Every recording path is driven by
`ondataavailable`, and chunks stream into multipart parts as they arrive rather than being buffered
to the end, so a long take does not risk a five-minute upload or total loss on a tab crash.
