# Demo video platform, implementation plan

A chaptered video review tool for end-of-sprint client demos. Creators upload a screen
recording and mark named sections. Members open the video, click a section title, and playback
jumps to that second without downloading the whole file.

Decisions behind this plan are in `docs/decision/04-demo-video-platform.md`. Summary: new
independent `demo-hub` family in this monorepo (`apps/demo-server`, `apps/demo-frontend`),
one environment hosted on the dev side of the existing AWS account, a new Auth0 application in
the `dev-asap-hub` tenant, served at `demos.hub.asap.science` from a single CloudFront
distribution (app at `/`, API at `/api/*`, media at `/media/*`). DynamoDB single table with
ElectroDB, one progressive faststart MP4 per video, CloudFront signed cookies.

Hard rule throughout: nothing here may modify, depend on at runtime, or risk any CRN or GP2
stack, package behaviour, or CI path. Shared code is limited to build tooling, lint config,
`@asap-hub/react-components` for UI, and small utilities from `server-common`/`frontend-utils`
that have no CRN/GP2 coupling.

---

## Repo conventions to follow (from recon)

- Service naming: `demo-hub`, resources named `demo-hub-${stage}-<thing>`, mirroring
  `asap-hub` / `gp2-hub`.
- `serverless.ts` typed as `AWS` from `@serverless/typescript`; stage from `SLS_STAGE`
  (`dev` or `local` for now); region `us-east-1`; runtime `nodejs24.x`, `arm64`; esbuild
  packaging with `concurrency: 1`; plugins loaded via local `serverless-plugins/*.js`
  one-liner wrappers (Yarn PnP workaround).
- IaC in the `resources` block, raw CloudFormation, copying the CRN patterns: API Gateway v2
  domain + Route 53 alias, S3 + CloudFront with OAI, DynamoDB pay-per-request table.
- Frontend is a Vite app; its `dist/` is uploaded by `serverless-s3-sync` from the server
  stack. Env vars are `VITE_APP_DEMO_*`, injected at build time.
- Workspaces are picked up automatically by `apps/*` glob, turbo pipelines key off script
  names, jest discovers packages automatically. Constraints: `private: true`, identical
  version ranges across workspaces, `workspace:*` for internal deps, tsconfig `references`
  for every workspace dependency.
- Local DynamoDB already exists (`yarn dynamodb:start`, shared db on port 8000).

## Inputs still needed from the team

| Input                                                                    | Value                                |
| ------------------------------------------------------------------------ | ------------------------------------ |
| Auth0 client ID for the new app in `dev-asap-hub`                        | (to be provided, spec below)         |
| Confirmation the `hub.asap.science` cert covers `demos.hub.asap.science` | (to be confirmed)                    |
| CloudFront signing keypair                                               | generate at deploy time, see Phase 1 |
| Verified SES sender identity/address for invitation emails               | (to be provided)                     |

### Auth0 application spec (create in `dev-asap-hub`)

- Type: Single Page Application
- Allowed callback URLs: `https://demos.hub.asap.science`, `http://localhost:3500`
- Allowed logout URLs: same
- Allowed web origins: same
- No Actions, no webhooks, no Contentful or Algolia integration of any kind
- Connections: Google social login AND a database (email/password) connection, signups
  enabled; users are invited by email and create their own account with either method
- API (audience): `https://demos.hub.asap.science`

Because signup is open, Auth0 does not gate access; the DynamoDB roster does (see Phase 3
invite-first model). Email/password accounts must have a verified email before the invite
claim is honoured.

---

## Budget constraints (unchanged from the original plan)

The stack must run under $5/month.

- No VPC for Lambda; token validation happens in the API layer, no NAT gateway anywhere.
- Fargate encode task in a public subnet with `assignPublicIp: ENABLED`, egress-only SG.
- No load balancer. API Gateway terminates and CloudFront fronts it.
- CloudFront signing private key in SSM Parameter Store as `SecureString`, not Secrets
  Manager.
- One 1080p rendition, no HLS.
- 30-day log retention on every log group.
- S3 lifecycle: abort incomplete multipart uploads after 7 days, expire `raw/` after 30 days,
  transition `media/` to Glacier Instant Retrieval after 90 days.

---

## Phase 1, workspace + infrastructure (`apps/demo-server`)

Scaffold the workspace (package.json, tsconfig with references, babel config, serverless
plugin wrappers) and write `serverless.ts`:

1. **DynamoDB table** `demo-hub-${stage}-data`, on-demand, PITR enabled, `PK`/`SK` string
   keys, GSI `GSI1` on `GSI1PK`/`GSI1SK`, projection `ALL`.
2. **Storage bucket** `demo-hub-${stage}-storage`, private, all public access blocked,
   prefixes `raw/{videoId}/` and `media/{videoId}/`, lifecycle rules as above, CORS allowing
   `PUT`/`POST`/`GET`/`HEAD` from the app origin with `ETag` in `ExposeHeaders` (multipart
   completion from the browser fails without it).
3. **Frontend bucket** `demo-hub-${stage}-frontend`, synced from `../demo-frontend/dist` via
   `serverless-s3-sync` (same mechanism as CRN).
4. **CloudFront distribution**, price class 100, alias `demos.hub.asap.science`, existing
   wildcard ACM cert (ARN via env):
   - behaviour `/api/*`: API Gateway origin (same pattern as CRN's `apigw` origin), no
     caching, forward `Authorization`
   - behaviour `/media/*`: storage-bucket origin restricted by OAI, viewer access restricted
     by a trusted key group, cache on URI only, forward no cookies to origin
   - default behaviour: frontend bucket, SPA fallback 404 -> `/index.html`
   - trusted key group from a CloudFront public key; the PEM is public and lives in CI env
     config, the private key is placed in SSM by hand once
     (`/demo-hub/${stage}/cloudfront-private-key`)
   - Route 53 alias record in the existing `hub.asap.science.` zone
5. **ECR repository** for the encoder image, keep last 5 images.
6. **ECS cluster** (Fargate) + task definition: 4 vCPU, 8 GB, ARM64. Task role scoped to
   `s3:GetObject` on `raw/*`, `s3:PutObject` on `media/*`, `dynamodb:UpdateItem` on the
   table.
7. **EventBridge rule** on S3 `Object Created`, prefix `raw/`, target ECS `RunTask` in the
   default VPC's public subnets, object key passed as container override.
8. **Alarms**: CloudWatch alarm on encode failures; monthly cost is reviewed rather than
   budget-alarmed since the account budget alarm already exists at account level.

Acceptance: `serverless package` succeeds locally; the template contains no NAT gateway, load
balancer, or Elastic IP; a `GET` on `/media/*` without cookies returns 403 once deployed.

## Phase 2, data layer

ElectroDB (new dependency, demo-server only) + zod on every boundary.

| Item   | PK            | SK        | GSI1PK              | GSI1SK                       |
| ------ | ------------- | --------- | ------------------- | ---------------------------- |
| Video  | `VIDEO#{id}`  | `META`    | `FOLDER#{folderId}` | `{status}#{recordedAt}#{id}` |
| Folder | `FOLDER#{id}` | `META`    | `FOLDERS`           | `{name}`                     |
| User   | `USER#{sub}`  | `PROFILE` | `USERS`             | `{name}`                     |

Video attributes: `title`, `status` (`draft`|`published`), `folderId`, `recordedAt`,
`durationMs`, `chapters` (`{ startMs, title }[]`), `s3Prefix`, `createdBy` (`{ sub, name }`),
`lockedBy`, `lockedByName`, `lockExpiresAt`, `version`, `processingState`
(`uploading`|`processing`|`ready`|`failed`).

Rules:

- status lives in the GSI1 sort key; member listings query
  `begins_with(GSI1SK, 'PUBLISHED#')` so a draft cannot be returned; never filter status with
  a filter expression
- chapters are one array attribute, written as a complete set; store `startMs` integers and
  derive end times
- denormalise `createdBy.name` and `lockedByName` so the UI never needs a second read

Tests (scoped, `--runInBand`): create video, list published in folder, list all as creator,
update chapters, move between folders, and an assertion that the member listing query cannot
express a draft.

## Phase 3, auth and authorisation

1. API Gateway HTTP API JWT authorizer: issuer `https://dev-asap-hub.us.auth0.com/`,
   audience `https://demos.hub.asap.science`. Express app behind it reads the claims from the
   request context (no in-handler token verification to maintain).
2. Invite-first access. Creators invite an email address (`POST /api/invites`), writing an
   `INVITE#{email}` item with the intended role. On first authenticated request, read the
   verified email claim, look up the invite, and only then create `USER#{sub}` with the
   invited role (conditional put, `attribute_not_exists(PK)`). No invite, or an unverified
   email, means 403 on everything: an open Auth0 signup alone grants nothing. Google and
   email/password logins for the same email are different subs; whichever arrives first
   claims the invite (document the second-login case in the runbook). The invite endpoint
   also sends the invitation email via SES (not Postmark): a plain notification telling the
   person to create an account at the app URL with that exact email address. IAM scoped to
   `ses:SendEmail` on the demo sender identity; env `SES_REGION` and `EMAIL_SENDER`.
3. Role read from DynamoDB per request, never from the token; changing a role applies on the
   next request.
4. Two roles: `creator` (upload, edit, draft, publish) and `member` (watch published only).
   Promotion is an `UpdateItem` documented in the runbook.
5. Enforcement, all server side: mutating handlers require `creator`; member listings
   constrain GSI1SK to `PUBLISHED#`; the cookie endpoint refuses drafts for members.
6. Cookie minting: `POST /api/videos/{id}/access` checks view permission, then sets
   `CloudFront-Policy` / `CloudFront-Signature` / `CloudFront-Key-Pair-Id` cookies scoped to
   `/media/{videoId}/*`, `Secure`, `HttpOnly`, `SameSite=Lax`, 12-hour expiry. Same-origin,
   so no `Domain` attribute games.

## Phase 4, upload

Video bytes never pass through Lambda; Lambda only signs.

- `POST /api/uploads`: create video item in `uploading` state, start S3 multipart upload
- `POST /api/uploads/{uploadId}/parts`: presigned URLs for a batch of part numbers
- `POST /api/uploads/{uploadId}/complete`: complete multipart, set `processing`
- `DELETE /api/uploads/{uploadId}`: abort

Client: 10 MB parts, 6 concurrent, 3 retries with backoff, collect `ETag`s, progress by bytes.

## Phase 5, processing container

ARM64 image with ffmpeg/ffprobe under `apps/demo-server/encoder/`. Entrypoint: copy raw
object, probe duration, encode

```
ffmpeg -i in.mp4 -c:v libx264 -preset medium -crf 24 \
  -g 60 -keyint_min 60 -sc_threshold 0 \
  -c:a aac -b:a 128k -movflags +faststart stream.mp4
```

(`+faststart` enables range-request seeking; the keyframe group keeps chapter clicks from
hitching), build a sprite sheet + WebVTT thumbnails, upload to `media/{videoId}/`, set
`durationMs` and `processingState=ready`, or `failed` with the error on any failure.

Image is built and pushed to ECR by a CI job on change (manual push documented for bootstrap).

## Phase 6, studio (creator UI)

Keyboard-first chapter editor (space play/pause, `M` mark, arrows nudge 1 s, shift-arrows one
frame), editable timecode/title table with derived end times, first chapter snapped to 0, no
row reordering until blur, saves debounced.

Edit lease, not a lock: conditional update setting `lockedBy`/`lockedByName`/`lockExpiresAt`
(90 s), heartbeat every 30 s, release on navigate/`beforeunload`, 409 with the holder's name
from `ReturnValuesOnConditionCheckFailure` (no second read). No DynamoDB TTL. The real
guarantee is every save conditioned on `lockedBy = :sub AND version = :expected` with a
version increment.

Publish: flip status (rewrites `GSI1SK`) and write `media/{videoId}/chapters.json` to S3
inline in the same handler so the watch page reads chapters from the CDN edge.

Folders: one level, `GSI1PK='FOLDERS'` sorted by name, unfiled under `FOLDER#ROOT`, no
nesting.

## Phase 7, watch page (member UI)

On load, `POST /api/videos/{id}/access`, then fetch `chapters.json` and `stream.mp4` through
CloudFront. Chapter list beside the player (`currentTime = startMs / 1000`), progress bar
segmented at chapter boundaries, sprite thumbnails on scrub, `?t=561` deep links, clear error
state when the cookie is missing or expired.

## Phase 8, frontend plumbing

Vite app matching `crn-frontend` (React 18.3.1, react-router 7.13.0, TanStack Query,
emotion + `@asap-hub/react-components`), own thin Auth0 provider on `@auth0/auth0-spa-js`
(not the CRN/GP2 contexts), config via `VITE_APP_DEMO_*` with localhost fallbacks, dev server
on port 3500.

## Phase 8b, local development

Fully runnable locally; colleagues need Docker (amazon/dynamodb-local and minio/minio via
the repo's docker-compose) and optionally ffmpeg for real local encodes.

- `SLS_STAGE=local` serverless-offline for the API against local DynamoDB (port 8000);
  a `dynamodb:local:setup` script creates `demo-hub-local-data` with the GSI
- local S3 via a `minio/minio` service added (additively) to the repo docker-compose; the
  setup script creates the bucket. One `S3Storage` driver everywhere: locally it points at
  the MinIO endpoint (path-style, dummy creds) so the presigned multipart flow is identical
  to deployed. `/media/*` is streamed through Express from the bucket with Range pass-through
  (no CloudFront locally, cookie signer is a no-op); encode runs the same ffmpeg command
  inline when ffmpeg exists, otherwise the file is copied through unchanged
- auth is real: the SPA uses the `dev-asap-hub` tenant with the `http://localhost:3500`
  callback; no fake-auth path
- Vite dev server on 3500 proxies `/api` and `/media` to the local backend, preserving the
  same-origin model
- root scripts: `start:demo` (backend + frontend), following the existing naming

## Phase 9, CI/CD

- New `demo-sls-package` / `demo-sls-deploy` jobs mirroring the CRN ones, with slim
  demo-specific composite actions (the existing ones require Contentful/Algolia inputs).
- Demo deploys only in the Development phase of `on-push-master.yml`; no PR stacks and no
  production deployment for now.
- `demo-*` keys in `.github/environment/{Base,Development}` (hostname, cert ARN, Auth0
  domain/client/audience, CloudFront public key).
- Encoder image build+push job, triggered on `apps/demo-server/encoder/**` changes.

## Phase 10, operations

Runbook covering: video stuck in `processing`, failed encode, a lease that will not release,
promoting a user to creator, rotating the CloudFront signing keypair, restoring from PITR.
Verify lifecycle rules fired after 30 days. Cost review at 60 days; a bill above $10 for this
stack means a constraint was violated.

---

## Open questions to raise rather than guess

- should a video be assigned to a folder at upload time, or filed afterwards?
  (current answer: filed at upload with `FOLDER#ROOT` default, movable afterwards)
- do members need notifying when a demo is published, and through which channel?
  (out of scope for v1; no email infrastructure is wired on purpose)
