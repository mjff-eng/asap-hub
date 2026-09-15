# ADR-04: Storage and delivery for the demo video platform

**Status:** Accepted
**Date:** 2026-08-18
**Deciders:** Amin Aimeur

## Context

Sprint demo recordings for the client run 30 to 50 minutes and cover many tickets in one
session. Viewers lose track of what they are watching. We want named, clickable sections so a
viewer can jump straight to the feature they care about.

Shape of the workload:

- 2 videos per week, roughly 600 MB each
- 2 to 4 creators uploading, based in the UK and Portugal
- 10 to 20 viewers, based in the US, watching over the following 2 to 6 weeks
- 10 to 15 chapter titles per video
- recordings are client material and must not be publicly reachable

This is internal tooling with a small, known user base. The dominant constraint is that running
cost should stay low enough that nobody has to justify it, and that the thing needs minimal
operational attention between sprints.

## Decision

### Where it lives

The platform is a new, independent app family inside this monorepo: `apps/demo-server` and
`apps/demo-frontend`, Serverless service name `demo-hub`. It follows the repo's conventions
(Yarn workspaces, turbo, esbuild packaging, Vite frontend, emotion and
`@asap-hub/react-components` for UI) but shares no runtime infrastructure with CRN or GP2: its
own CloudFormation stack, its own DynamoDB table, S3 bucket, CloudFront distribution, and its
own Auth0 application. Removing the `demo-hub` stack must touch nothing else. No Contentful, no
Algolia, no OpenSearch, no SES/Postmark.

### Environment and account

One deployed environment only, hosted entirely on the dev side of the existing ASAP AWS account
(`SLS_STAGE=dev`), so nothing production-related in ASAP is touched. The stack stays fully
stage-parameterised so a second environment can be added later if the tool proves itself, but
nothing beyond the single dev-hosted environment is provisioned now.

### Identity

A new Auth0 application in the existing `dev-asap-hub` tenant. Users (creators and viewers) are
invited by us; there is no public signup and no link to CRN or GP2 user models. Token
validation reuses the repo's pinned-pubkey approach (`@asap-hub/auth` pubKeys pin the tenant),
with a demo-specific audience. Roles live in DynamoDB, not in the token.

### Domain

`demos.hub.asap.science`, served by one CloudFront distribution: the app at `/`, the API under
`/api/*` (API Gateway origin, same pattern CRN uses), and the media under `/media/*`. A single
origin means the signed cookies are first-party and the API needs no CORS.

This subdomain needs only one alias record in the existing `hub.asap.science` hosted zone,
created by this stack's own `RecordSetGroup`, and is covered by the existing
`*.hub.asap.science` wildcard certificate. A sibling apex such as `demos.asap.science` would
have required a new hosted zone, NS delegation in the `asap.science` parent, and a new
certificate; not worth it for an internal tool. Fallback if the wildcard certificate turns out
not to cover it: issue a dedicated us-east-1 ACM certificate for `demos.hub.asap.science`; the
hostname and certificate ARN are both configuration.

### Storage and delivery

Three choices, taken together:

1. Store video metadata and chapters in DynamoDB, on-demand, single table with one GSI.
2. Deliver a single 1080p progressive MP4 through CloudFront, relying on HTTP range requests
   for seeking. No adaptive bitrate.
3. Control access with CloudFront signed cookies rather than signed URLs.

## Options considered

### Storage: DynamoDB vs a managed relational database

| Dimension         | DynamoDB                              | RDS PostgreSQL (t4g.micro)                                                 |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Cost              | Effectively $0 at this volume         | ~$14/month, roughly 85% of the total bill                                  |
| Idle cost         | None                                  | Charged continuously                                                       |
| Network           | No VPC needed                         | VPC required, which forces a NAT gateway for Auth0 JWKS access from Lambda |
| Team familiarity  | Low, single-table design is new to us | High, existing Postgres experience                                         |
| Query flexibility | Adequate for known access patterns    | Better for unanticipated queries                                           |

The data is a video record plus a short array of chapter titles: about 1,500 rows after a year,
well under a megabyte. Relational features earn nothing here, while the fixed instance cost and
the VPC requirement both do real damage to a stack that otherwise has no always-on components.
The repo already runs DynamoDB Local in Docker and has an existing pay-per-request table
pattern (cookie preferences), so the local-dev and IaC groundwork exists.

We also considered JSON documents in S3 as the sole store. Rejected: the listing page would
need a hand-maintained root index rewritten on every save, with a repair script for when it
drifts, since there is no transaction across two objects. DynamoDB provides the same listing as
a GSI query, and costs the same nothing.

### Delivery: progressive MP4 vs HLS

| Dimension        | Progressive MP4                       | HLS                                   |
| ---------------- | ------------------------------------- | ------------------------------------- |
| Seeking          | HTTP range requests, native `<video>` | Segment requests, needs hls.js        |
| Adaptive bitrate | No                                    | Yes                                   |
| Encode cost      | ~$0.40/month                          | ~$1.50/month for a 3-rendition ladder |
| Moving parts     | None beyond the encode                | Manifests, segments, player library   |

Streaming behaviour, playback starting immediately and seeking without a full download, comes
from range requests against a faststart MP4, not from HLS. What HLS adds is switching between
renditions mid-playback. We have decided viewers get 1080p regardless of their connection, so
that capability has nothing to do.

### Access control: signed cookies vs signed URLs

Signed URLs would require signing every request. A single video generates a large number of
byte-range requests, so this is impractical. A signed cookie is issued once per session, scoped
by resource path to one video's prefix, and the browser attaches it automatically. With app,
API, and media on one origin the cookie is first-party and `SameSite=Lax` just works.

## Trade-off analysis

The DynamoDB choice trades query flexibility and team familiarity for the removal of every
always-on component in the stack. That trade is favourable while the access patterns stay as
narrow as they are now: list videos in a folder, fetch one video, update its chapters. It
becomes unfavourable if the tool grows features that need ad-hoc joins, such as cross-sprint
search or reporting on viewing behaviour.

The MP4 choice trades resilience to poor connections for simplicity. It is the right call for
viewers at desks on office connections and the wrong call for viewers on mobile or hotel wifi.
This is a bet on the viewing context, not on the technology.

Hosting the single environment on the dev side trades the word "production" for isolation: the
tool's real users depend on a dev-stage stack. Acceptable for an internal tool with a known
audience; the stack is stage-parameterised so promoting it later is mechanical.

## Consequences

Easier:

- no instance to patch, no maintenance window, no connection pool, no VPC
- the whole stack costs a few dollars a month, so no cost conversations
- playback uses the native video element, so there is less client-side machinery to debug
- deployment, CI, local DynamoDB, and auth plumbing are reused from the repo rather than built

Harder:

- single-table design is unfamiliar; expect the first PRs to need review attention on key
  construction. ElectroDB is mandated to keep access patterns declarative rather than
  scattering key strings through handlers
- adding a query the key design did not anticipate means adding a GSI and backfilling, rather
  than writing a new `WHERE` clause
- the repo's single-version dependency constraint means new dependencies must match versions
  already used elsewhere in the monorepo

To revisit:

- if viewers report buffering, add an HLS ladder. This is additive: extra outputs on an ffmpeg
  command that already runs, keep the MP4, swap the player. Nothing else moves, and signed
  cookies are already the auth model HLS needs
- if the tool is opened to a second client, revisit whether per-client access control fits the
  current key design or needs a new GSI
- if unanticipated query patterns accumulate, reconsider a relational store. Migrating is
  mechanical, since the DynamoDB items map one-to-one onto a normalised schema
- if the tool proves itself, add a real second environment and consider moving the primary one
  off the dev stage

## Action items

1. [ ] Create the Auth0 application in the `dev-asap-hub` tenant (spec in the implementation
       plan) and provide its client ID
2. [ ] Confirm the `hub.asap.science` ACM certificate is a wildcard covering
       `demos.hub.asap.science`; if not, issue a dedicated us-east-1 certificate
3. [ ] Agree the retention period for recordings with whoever owns the client relationship
4. [ ] Invite the initial creators and members in Auth0
