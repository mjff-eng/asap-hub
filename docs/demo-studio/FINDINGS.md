# Demo studio findings

Issues and discoveries that affect the build, newest first. Severity drives what happens next:

| Severity        | Meaning                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| **P0 blocker**  | Stops the current milestone. Work stops and [PLAN.md](./PLAN.md) is re-ordered immediately. |
| **P1 must-fix** | Ships before the next milestone starts.                                                     |
| **P2 backlog**  | Recorded with enough detail to pick up later. Does not interrupt.                           |

Each entry records what was observed, why it matters, and what was decided, so nothing is silently
dropped.

---

## F-020 (P2, backlog) Structural work the architecture review called for

Three reviewers went over the whole codebase. Everything they found that was a
_correctness_ problem is fixed and logged below. These are the structural ones,
recorded here rather than done, because each is a refactor with no behaviour
change and they are better done deliberately than in the middle of a bug-fix
pass.

- **One save model, not three.** `studio/project/useProjectEditor.ts` and the
  `Editor` in `pages/StudioVideo.tsx` are the same machinery written twice
  (debounce, single flight, 409 rebase, version ref) and they have already
  drifted: one retries a conflict immediately, the other waits for the next
  autosave. Extract one `useVersionedSave<T>`.
- **`pages/Home.tsx` is 963 lines and twenty pieces of state.** The seams are
  already visible: `useLibrarySelection`, `useLibraryDnd`, and the two delete
  modals as components.
- **`pages/StudioVideo.tsx`'s `Editor` is 560 lines**, with the row-editing
  state (`drafts`/`invalid`/`endDrafts`/`endInvalid`/`focusedKey`) wanting to be
  a `useChapterRows` reducer.
- **The encode pipeline exists three times**: `encoder/finish.sh` in bash,
  `encoder/render.ts` in TypeScript, and `src/local-encoder.ts` again. The
  sprite grid, VTT arithmetic and poster offset must stay numerically identical
  across all three or a locally encoded video and a rendered one disagree about
  where the tiles are. Lift the pure parts into `@asap-hub/demo-timeline`, give
  `render.js` a `finish` sub-command, and delete `local-encoder.ts` now that
  `DockerJobRunner` covers the local path.
- **The S3 key layout is authored in five places** (`src/storage.ts`,
  `ingest.sh`, `finish.sh`, `encoder/render.ts`, `encode.sh`), and
  `storage.ts:assetProxyKey` has no callers while `ingest.sh` hardcodes the same
  string. Rename a prefix and a job breaks at runtime rather than at build.
- **The confirm dialog and the admin table are copy-pasted three ways**
  (`Users.tsx`, `Invites.tsx`, `Home.tsx`) — about 150 lines deletable with no
  behaviour change.
- **Every guarded write costs an extra read.** `respondWithVideo` is defined
  identically in two route files and re-gets the row that was just written;
  `UpdateCommand` already supports `ReturnValues: 'ALL_NEW'`.
- **Listing endpoints fan out unboundedly.** `videosInFolder` always uses
  `pages: 'all'`; `/videos/all` and `/folders/counts` each run one unbounded
  query per folder, and counts materialises every item to call `.length`.
- **Three composition shapes for one resource**: `registerAssetRoutes(router)`
  mutates a router, `recordingsRouter()` is mounted separately at the same path,
  and the rest are ordinary mounts, so `/projects/:id/assets` is undiscoverable
  from `app.ts`.
- **The timeline has no keyboard path.** Trimming and reordering are pointer
  only, and the clip and lane blocks nest real buttons inside a
  `div role="button"`, which is invalid for assistive technology.
- **The inspectors ask creators to type milliseconds**, while `formatTimecode`
  and `parseTimecode` both already exist and `StudioVideo` already pairs them.
  A `TimecodeField` in `fields.tsx` would fix every inspector at once.
- **Text edits still push one undo entry per keystroke.** The gesture model
  added for drags (F-016) covers pointer work; the inspectors and the chapter
  list want the same treatment on focus and blur.

## F-019 (P1, fixed) A screen share ended from the browser's own bar lost the take

**Observed.** The `ended` listener on the display track only called
`setStatus('finishing')`. Nothing stopped the recorder, nothing awaited it,
nothing uploaded, and the microphone stream stayed live — while the panel
disabled every control because the status said it was saving. Chrome's own
"Stop sharing" bar is how most recordings end, so this was the common path.

**Why it matters.** The take was unrecoverable, and a later `stop()` would throw
`InvalidStateError` on an already-inactive recorder, which was then swallowed.

**Fixed.** The track's `ended` handler runs the real stop path and hands the
finished take to `onEnded`, which `useRecordingTake` wires to its upload;
`session.finish()` resolves immediately when the recorder is already inactive;
a refused microphone degrades to video-only instead of abandoning a shared
screen with no way to stop it; and `start()` will not run twice over itself.

## F-018 (P1, fixed) The editor took keys away from whatever was focused

**Observed.** The shortcut listener only excluded inputs and textareas, so Space
on a focused button toggled playback instead of pressing it (making the action
bar keyboard-unreachable), the arrow keys fought the seek bar's own handler and
moved 1100ms per press, and there was no modifier guard at all — **Cmd+S split
the clip**. There was no undo shortcut, in an editor.

**Fixed.** `claimsKeyboard` also stands aside for buttons, links, selects and
anything with `role="slider"`; a modifier now suppresses the unmodified
bindings; and Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z undo and redo.

## F-017 (P1, fixed) The editor re-rendered everything sixty times a second

**Observed.** `playheadMs` lives in `ProjectEditor`, so every animation frame
re-rendered the whole tree. Only `Timeline`'s lanes were memoised. Per frame it
re-ran `resolveChapters` (a second full layout pass, a map build, a sort and a
dedupe), rebuilt the entire recorder panel tree by calling the render prop
during render, and allocated a fresh selection object and a fresh empty array so
nothing downstream could ever be skipped.

**Fixed.** The chapter list, the recorder tree and the resolved selection are
memoised, the empty cursor list is a module constant, and the five panels are
`memo`. Moving the playhead into its own subscription is the next step if the
timeline ever gets long enough to need it.

## F-016 (P1, fixed) One drag filled the undo history

**Observed.** Every pointer move dispatched a reducer action and every action
recorded a history entry. With a limit of 100, a two-second drag produced about
120 entries: one undo stepped back a single frame of the drag, and two drags
flushed everything before them out of the past.

**Fixed.** The editor has gestures. `beginGesture`/`endGesture` bracket a drag,
and inside one the first edit records a history entry while the rest replace it,
so a drag is one undoable step. It also means one autosave rather than one per
frame.

## F-015 (P0, fixed) The last edit was dropped when the editor was left

**Observed.** The autosave effect cleared its timer on unmount, so navigating
away or closing the tab inside the 1.5s debounce discarded the edit with no
flush and no warning — while `useEditLease` released the lease on `beforeunload`
regardless, so the next editor opened a document quietly missing it.

**Fixed.** `useProjectEditor` exposes `dirty` and `flush`. Unmount flushes (the
page is still alive on an in-app navigation), `beforeunload` flushes and warns,
and the export flushes before it starts so the container never renders a
timeline older than what is on screen.

## F-014 (P1, fixed) A studio project looked like a demo stuck in encoding

**Observed.** Creating a project writes a `Video` row straight away with `processingState: 'empty'`,
and `VideoStatusBadge` mapped anything other than `ready` to **Processing**. Three projects in the
local library had sat that way for hours with `render: null`, showing a `0:00` running time. The
card also linked every video to `/studio/videos/:id`, the upload editor, which answers "This demo is
still processing" for a project it can never encode.

**Why it matters.** The creator had no way to tell a draft they had not finished from a demo the
encoder had lost, and following the card led to a dead end rather than back into the studio.

**Fixed.** `empty` now reads **Studio draft**; `editPathOf` sends a project to `/studio/projects/:id`
and an upload to `/studio/videos/:id`; `StudioVideo` redirects a project to the editor; the running
time and the poster request are both dropped when there is no output; and the watch page says the
demo has not been exported rather than inviting the viewer to wait. The render control is now an
explicit **Export to a demo**, and the studio header carries the title, the draft badge and
publish/unpublish, so a project reaches members from inside the studio.

## F-013 (P0, fixed) The export was rejected by its own autosave

**Observed.** `POST /projects/:id/render` answered 409 every time. The page passed
`video.version` from the React Query cache, but each autosave bumps the row version through
`useProjectEditor`'s own state without writing it back to that cache, so the version sent was stale
from the first save onwards.

**Why it matters.** Nothing could be exported after a single edit, which is every real project. It
surfaced only as "Could not start the render".

**Fixed.** `useProjectEditor` exposes `version` and `rebase`, and the export, cancel, rename,
publish and unpublish calls all take the editor's version and hand the one that comes back straight
back to it. The export button is also disabled while a save is in flight, so the two cannot race.

## F-012 (P1, fixed) An ingest that never started stranded the asset for good

**Observed.** Two assets sat in `preparing` indefinitely. `docker run` had failed at upload time
(the encoder image did not exist yet) and the error was logged and swallowed, so the asset kept a
state that says "a container is working on this". Running the same job by hand finished in seconds.

**Why it matters.** Without a probed duration the trim upper bound collapsed to the clip's own out
point, so the clip could only ever be shortened; and the editor never re-fetched the asset, so even
a job that did finish went unnoticed until a reload.

**Fixed.** A job that cannot start marks the asset `failed` with a reason the media panel shows, the
editor polls the asset list while anything is uploading or preparing, and `trimClip` treats an
unknown asset length as no upper bound rather than as the current out point.

## F-011 (P1, fixed) A trim handle ran away from the pointer

**Observed.** Dragging a clip's start recomputed `inMs` from `placement.startMs` on every pointer
move. On a gapless track that edge never moves, so the offset was added again each frame instead of
converging, and the edge accelerated away. Trimming could only ever shorten a clip.

**Why it matters.** Trimming is the most used gesture in the editor and it could not be undone by
hand.

**Fixed.** Every drag now records where it began and what the item measured then, and each frame is
computed from that origin (`studio/editor/dragging.ts`). One `spanAfterDrag` moves and resizes
banners, zooms, voice over takes and title cards; `trimAfterDrag` does the same for source clips.

## F-010 (P2, fixed) Zoom focus could only be pinned, not aimed

**Observed.** A zoom's focus was set by clicking a crosshair on the preview, with no feedback about
what the zoom would actually frame, and its length could only be changed by typing milliseconds into
the inspector.

**Why it matters.** Aiming a zoom is a judgement about framing, and it cannot be made without seeing
the frame.

**Fixed.** Selecting a zoom holds it on the preview so the stage shows exactly what the export will
frame, and the picture is dragged with a grab cursor to aim it (`panFocus`). Zooms, banners and
title cards all resize from either edge on the timeline.

## F-009 (P1, fixed) The encoder image had no `rsvg-convert`

**Observed.** The image installed Alpine's `librsvg`, which ships the library but not the command
line tool. `which rsvg-convert` in the built image found nothing.

**Why it matters.** Title cards and banners are rasterised from SVG by `rsvg-convert`, so every
render carrying text would have failed inside the container, while passing every test and every
local run on a machine that happens to have the tool.

**Fixed.** The image installs `rsvg-convert` (which pulls librsvg with it), and the build now asserts
that every binary a job needs is present, so a missing one fails the image build rather than the
first render. Verified by rendering a timeline with a title card, a banner and a slide transition
inside the container: 1920x1080 at 30fps with the text exactly as the preview draws it.

## F-008 (P1, fixed) The join failed on every real render: audio format and timebase

**Observed.** Running the renderer against real files, the three per-clip encodes succeeded and the
join died with `ffmpeg exited 234`, `Error reinitializing filters`. Two separate causes, neither of
which any unit test could have caught because both live in ffmpeg's runtime behaviour:

1. A source recording's audio is typically 44.1kHz mono, while the silence generated for a title
   card is 48kHz stereo. `concat` and `acrossfade` refuse to join streams whose rate, layout or
   sample format differ.
2. `concat` rewrites the timebase of what it produces (to 1/1000000), and `xfade` refuses two inputs
   whose timebases differ, so blending a concatenated run with a raw clip failed with
   `First input link main timebase (1/1000000) do not match ... (1/15360)`.

**Why it matters.** Every render with a title card or a transition would have failed, which is most
of them. The plan looked correct in the snapshots, and was.

**Fixed.** Each clip's audio chain ends with
`aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`, and every branch entering an
xfade is pinned with `settb=AVTB`. Verified by rendering two clips, a title card, a banner and a
crossfade end to end: 1920x1080 h264 at 30fps, AAC 48kHz stereo, duration exactly the sum of the
clips minus the crossfade, with the sprite, VTT and poster beside it and the item flipped to ready.

## F-007 (P2) The container consumes the shared package through its build output

**Observed.** The first end to end render failed with `buildRenderPlan is not a function`: esbuild
bundled `@asap-hub/demo-timeline` from its `build-cjs` output, which predated the render module.

**Why it matters.** It is the same trap as F-005 wearing a different hat, and the error names a
function that plainly exists in the source.

**Decided.** `yarn demo:local:encoder` builds the renderer bundle before the image, and the package
has to be built first. Anyone editing the shared package needs `yarn watch` running, or a manual
`yarn workspace @asap-hub/demo-timeline run build:babel`.

## F-006 (P1) `.env` forces `NODE_ENV=development`, which breaks `test/storage.test.ts`

**Observed.** `apps/demo-server/test/storage.test.ts` fails before a single test runs, with
`SyntaxError: Delete of an unqualified identifier in strict mode` on `delete undefined`. It fails
identically with all of my changes stashed, so it predates this work. The chain is:

1. `.yarnrc.yml` installs `yarn-plugin-dotenv`, which injects the local `.env` into every process
   started through `yarn`, and it overrides variables already exported
   (`NODE_ENV=test yarn node -e '…'` still prints `development`).
2. `.env:128` sets `NODE_ENV=development`.
3. `babel-base.config.js` enables `babel-plugin-transform-inline-environment-variables` whenever
   `NODE_ENV !== 'test'`, so during tests every `process.env.X` read is replaced with its value at
   transform time.
4. That turns the file's first statement, `delete process.env.BUCKET_NAME`, into `delete undefined`,
   which is a syntax error under strict mode.

In CI there is no `.env`, so jest sets `NODE_ENV=test` itself, the plugin stays off and the file
parses. This is a local-only failure.

**Why it matters.** The blast radius is narrower than it first looks: `storage.test.ts` is the only
file that uses `delete process.env`, and `uploads.test.ts`, `app.test.ts` and `id-guards.test.ts` all
pass. But no test on this machine can meaningfully change an environment variable at runtime, because
reads were already baked in at transform time, and the one file that tries cannot run at all.

**Decided.** The pure key-builder tests moved to a new `test/storage-keys.test.ts`, so the guard that
keeps studio keys out of `raw/` actually runs. `storage.test.ts` is left as it is, still unrunnable
locally. The one-line fix belongs to the product owner because `.env` is his untracked local file:
remove or comment `NODE_ENV=development` there, after checking nothing in his local CRN or GP2
workflow depends on it.

## F-005 (P1) Workspace package builds fail on this machine: `babel: command not found`

**Observed.** `yarn workspace @asap-hub/demo-timeline run build:babel` fails with
`../../scripts/build-babel.sh: line 10: babel: command not found`, and so does
`yarn workspace @asap-hub/validation run build:babel`, an untouched existing package. The repo uses
Yarn PnP (`nodeLinker: pnp`, no `node_modules/.bin`), and `@babel/cli` is declared only in the root
`package.json`, so a workspace script never sees the binary. `yarn babel --version` works from the
root, which is why this is invisible until a package actually needs rebuilding.

**Why it matters.** The server consumes shared packages through their `build-cjs` output, so
`yarn watch` is the mechanism that makes package changes take effect. On this machine it cannot
rebuild any package, and the committed `build/` directories are stale artefacts from the previous
machine. Any edit to a shared package would silently fail to reach the server.

**Decided.** `packages/demo-timeline` declares `@babel/cli` in its own `devDependencies`, which is
the correct declaration for a package whose build script runs it, and its build now succeeds. The
same one-line fix applies to every other package, but that is a repo-wide change outside this work,
so it is flagged for the product owner rather than done unilaterally.

## F-004 (P2) Ingest stays a shell script, only the renderer is Node

**Observed.** The plan calls for Node entrypoints in the encoder container. Ingest is only probe,
remux and upload, which `encode.sh` already does in bash with `S3_ENDPOINT` and `DYNAMODB_ENDPOINT`
overrides.

**Why it matters.** A Node entrypoint would need the workspace package bundled into the image before
it is needed. The renderer genuinely needs it (filtergraph generation from the timeline); ingest does
not.

**Decided.** Ingest is `encoder/ingest.sh`, sharing helpers with `encode.sh`. The renderer becomes a
bundled Node program in M1, when the timeline package actually exists to bundle.

## F-003 (P2) `local-encoder.ts` is a second implementation of the encode

**Observed.** `apps/demo-server/src/local-encoder.ts` reimplements the ffmpeg work of
`encoder/encode.sh` for local dev, so the two can drift.

**Why it matters.** A feature verified locally is only meaningfully verified if it ran the deployed
code path.

**Decided.** The Docker job runner makes the container the primary local path. `local-encoder.ts`
survives only as the fallback when Docker is unavailable, and is not extended with new features.

## F-002 (P1, resolved) MinIO had no published ports, which broke every upload

**Observed.** `rec-rustfs` from an unrelated project owns host ports 9000 and 9001, so the hub's
`minio` container started with none published (`docker inspect minio` showed `ports=map[]`). Every S3
call therefore reached rustfs, which rejects the `minioadmin` credentials. That surfaced as
`yarn demo:local:setup` failing its bucket step with `InvalidAccessKeyId`, a 500 from
`POST /api/uploads` in the app, and 403s on `/media/.../thumb.jpg`.

**Why it matters.** It looked like a missing environment variable but was a port collision, and it
blocked media upload, playback, ingest and render, which is every acceptance check in the plan.

**Resolved.** The hub's MinIO is published on **9010** (API) and **9011** (console) instead, so both
projects run at once: `docker-compose.yml`, the `LOCAL_S3_ENDPOINT` default in
`apps/demo-server/src/config.ts` and `scripts/local-setup.ts`, the Vite `/media` proxy target and the
README all moved together. `LOCAL_S3_ENDPOINT` still overrides it. Verified by running
`yarn demo:local:setup` clean and by a presigned multipart round trip (create, presigned part PUT,
complete, head, delete) against the bucket. Anyone with a running dev server has to restart it to
pick up the new endpoint.

## F-001 (P1) `PATCH /videos/:id` uses a hand-written update expression

**Observed.** `apps/demo-server/src/routes/videos.ts:307` names every attribute explicitly in a
hand-written `UpdateExpression` rather than going through ElectroDB. It uses `SET`, so attributes it
does not name are preserved rather than clobbered, but they can never be _written_ through this
route: adding an attribute to the entity alone silently fails to persist on save. `/publish` and
`/unpublish` repeat the same hand-rolled pattern, so the shape exists in triplicate.

**Why it matters.** Every new studio attribute risks being dropped on save with no error, and three
copies of the same lease-and-version conditional update is three places to get it wrong.

**Decided.** The timeline gets its own endpoint rather than riding on this route. The three copies
collapse into one tested `guardedUpdate({ set, remove, expectedVersion })` helper, and any attribute
that must go through `PATCH` is covered by a route test asserting it round-trips.
