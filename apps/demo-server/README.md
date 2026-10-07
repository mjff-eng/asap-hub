# Demo hub server

Backend for the chaptered demo video platform: creators upload a sprint recording, mark named
sections, and members open the video and jump straight to the section they care about. It is an
independent `demo-hub` stack inside this monorepo, sharing no runtime infrastructure with CRN or
GP2; the reasoning is in [`docs/decision/04-demo-video-platform.md`](../../docs/decision/04-demo-video-platform.md).

## Architecture at a glance

One CloudFront distribution serves everything on `demos.hub.asap.science`:

- `/` the frontend bucket (`apps/demo-frontend` built and synced by `serverless-s3-sync`)
- `/api/*` an API Gateway HTTP API with a JWT authorizer, backed by a single Lambda running the
  Express app in `src/app.ts`
- `/media/*` the storage bucket through an origin access identity, restricted to a trusted key
  group so only requests carrying CloudFront signed cookies get through

State lives in one DynamoDB table (`demo-hub-${stage}-data`, PK/SK plus a `GSI1` index) driven by
ElectroDB. Uploads go straight from the browser to S3 as a multipart upload; Lambda only signs the
parts. An object landing under `raw/` fires an EventBridge rule that runs the ffmpeg encoder as a
Fargate task (see [`encoder/README.md`](encoder/README.md)), which writes `stream.mp4`,
`sprite.jpg` and `thumbnails.vtt` under `media/{videoId}/` and flips `processingState` to `ready`.
Invitation emails go out through SES.

Access is invite first. Roles (`creator` and `member`) live in DynamoDB, never in the token: every
request reads the `USER#{sub}` item, and a signed-in user with no matching invite gets a 403
`not_invited` and sees a not-invited screen in the app.

## Local development

Prerequisites: Docker, and optionally `ffmpeg`/`ffprobe` on your PATH for real local encodes.

```sh
docker compose up -d
yarn demo:local:setup
yarn workspace @asap-hub/demo-server invite <email> creator
yarn start:demo
```

If `docker compose up -d` fails saying the `dynamodb-local` container name is already in use, run
`docker rm -f dynamodb-local` once and repeat the command.

`yarn start:demo` runs both halves; to run them separately use `yarn start:frontend:demo` and
`yarn start:backend:demo:sls`. The app is at http://localhost:3500 and the API at
http://localhost:5555, with the Vite dev server proxying `/api` and `/media` to the backend so the
same-origin model matches production.

Notes on the local setup:

- Auth is real. The frontend talks to the actual `dev-asap-hub` Auth0 tenant using the demo
  application's client id, which is baked into `apps/demo-frontend/src/config.ts` as a default. If
  you sign up with email and password you must click the verification email before the invite is
  honoured; an unverified address is treated as not invited.
- Sign in without an invite and you get the not-invited screen. Invite yourself first with the
  `invite` script above; the second argument is `creator` or `member` and defaults to `member`.
- S3 is MinIO, published on host ports 9010 (API) and 9011 (console at http://localhost:9011,
  `minioadmin` / `minioadmin`) because 9000/9001 are so often taken by another local S3. Override
  with `LOCAL_S3_ENDPOINT` if you remap it again. It uses the same
  presigned multipart flow as deployed. `/media/*` is streamed through Express with range
  pass-through instead of CloudFront, and the cookie signer is a no-op.
- Encoding runs inline in the backend process: the same ffmpeg command when ffmpeg is present,
  otherwise the raw file is copied through unchanged so the rest of the flow still works.

## Testing

Always scope tests to this workspace rather than running the whole suite:

```sh
WORKSPACE_PATH=apps/demo-server yarn workspace asap-hub test:workspace --runInBand
WORKSPACE_PATH=apps/demo-server yarn workspace asap-hub test:workspace --runInBand --testPathPattern videos
yarn lint --testPathPattern apps/demo-server
```

`yarn workspace @asap-hub/demo-server test` is the same thing without the extra flags.

## Deployment

There is one shared demo environment, `SLS_STAGE=dev` on `demos.hub.asap.science`. CI deploys it
from a PR branch whenever the PR touches `apps/demo-*`, and from master after merge (the
Development phase only, never Production). There are no per-PR demo stacks.

The non-secret values live in `.github/environment/Base` under `demo-*` keys and are wired through
`.github/actions/demo-sls-package` and `.github/actions/demo-sls-deployment`. Several are still
`TO_BE_SET`: `demo-email-sender`, `demo-vpc-id`, `demo-subnet-ids` and
`demo-cloudfront-public-key-b64`. The public key cannot be stored verbatim because that file is
parsed one `key=value` per line, so it is held base64 encoded on a single line
(`base64 -w0 public_key.pem`) and decoded back into `CLOUDFRONT_PUBLIC_KEY` by the two actions.

The encoder image is built and pushed to ECR by `.github/workflows/demo-encoder-image.yml`, which
runs on pushes and PRs touching `apps/demo-server/encoder/**`.

A manual deploy from a machine with credentials for the ASAP AWS account still works and needs the
same variables set.

`serverless.ts` asserts these variables are set for any stage other than `local`:

| Variable                  | Notes                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| `AWS_ACM_CERTIFICATE_ARN` | us-east-1 certificate covering the hostname                       |
| `AWS_REGION`              | `us-east-1`                                                       |
| `CLOUDFRONT_PUBLIC_KEY`   | PEM public half of the signing keypair, safe to keep in CI config |
| `DEMO_AUTH0_AUDIENCE`     | `https://demos.hub.asap.science`                                  |
| `DEMO_AUTH0_CLIENT_ID`    | Client id of the demo app in `dev-asap-hub`                       |
| `DEMO_AUTH0_DOMAIN`       | `dev-asap-hub.us.auth0.com`                                       |
| `DEMO_HOSTNAME`           | `demos.hub.asap.science`                                          |
| `DEMO_SUBNET_IDS`         | Comma separated public subnet ids for the encoder task            |
| `DEMO_VPC_ID`             | VPC the encoder security group is created in                      |
| `EMAIL_SENDER`            | Verified SES sender address for invitations                       |
| `HOSTED_ZONE_NAME`        | `hub.asap.science`, the zone the alias record is added to         |
| `SES_REGION`              | Region of the verified SES identity                               |
| `SLS_STAGE`               | `dev` or `local`                                                  |

Two more are read without an assertion: `CURRENT_REVISION` (used as the revision tag unless
`CI_COMMIT_SHA` is set) and `S3_SYNC_ENABLED`, which skips the frontend sync plugin when set to
`false`.

One-time manual steps before the first deploy:

1. Generate an RSA keypair for CloudFront signing. Put the private half in SSM as a
   `SecureString` at `/demo-hub/dev/cloudfront-private-key` and pass the public half as
   `CLOUDFRONT_PUBLIC_KEY`.
2. Confirm the existing `hub.asap.science` certificate is a wildcard that covers
   `demos.hub.asap.science`. If it is not, issue a dedicated us-east-1 certificate and point
   `AWS_ACM_CERTIFICATE_ARN` at it.
3. Verify the SES sender identity used for `EMAIL_SENDER`, and check whether the account is still
   in the SES sandbox.
4. Provide `DEMO_VPC_ID` and public `DEMO_SUBNET_IDS`; the encoder task runs with
   `AssignPublicIp: ENABLED` and no NAT gateway.
5. After the first deploy has created the ECR repository, build and push the encoder image, either
   by touching `apps/demo-server/encoder/**` so the encoder image workflow runs, or by hand (see
   [`encoder/README.md`](encoder/README.md)). Until an image exists, encode tasks fail to start.
6. When going live, add `https://demos.hub.asap.science` to the Auth0 application's allowed
   callback URLs, logout URLs, and web origins.

## Runbook

### A video is stuck in `processing`

Deployed: check the encoder task logs in the `/ecs/demo-hub-dev-encoder` log group, confirm the
`demo-hub-dev-encoder-raw-object-created` EventBridge rule is enabled and matching, and confirm the
ECR repository has an image tagged `latest`. A missing image is the usual cause after a fresh
deploy. Locally: the encode runs inline in the backend process, so check the backend output and
whether `ffmpeg` is on your PATH.

### An encode failed

The reason is on the video item as `processingError`, truncated to 500 characters:

```sh
aws dynamodb get-item \
  --table-name demo-hub-dev-data \
  --key '{"PK":{"S":"VIDEO#<video-id>"},"SK":{"S":"META"}}'
```

There is no reprocess endpoint. Delete the video in the studio and upload the file again; a new
upload lands under a new `raw/` prefix and triggers a fresh encode.

### An edit lease will not release

Leases expire on their own after 90 seconds, so waiting is almost always enough. To clear one by
hand:

```sh
aws dynamodb update-item \
  --table-name demo-hub-dev-data \
  --key '{"PK":{"S":"VIDEO#<video-id>"},"SK":{"S":"META"}}' \
  --update-expression 'REMOVE lockedBy, lockedByName, lockExpiresAt'
```

### Promote a user to creator

Roles are read from DynamoDB on every request, so the change takes effect on the next one.

```sh
aws dynamodb update-item \
  --table-name demo-hub-dev-data \
  --key '{"PK":{"S":"USER#<auth0-sub>"},"SK":{"S":"PROFILE"}}' \
  --update-expression 'SET #role = :role' \
  --expression-attribute-names '{"#role":"role"}' \
  --expression-attribute-values '{":role":{"S":"creator"}}'
```

Locally, or before someone has ever signed in, use the invite script instead:
`yarn workspace @asap-hub/demo-server invite <email> creator`.

### Rotate the CloudFront signing keypair

Generate a new keypair, write the new private key to
`/demo-hub/dev/cloudfront-private-key` in SSM, set `CLOUDFRONT_PUBLIC_KEY` to the new public half,
and bump the `-signing-key-v1` suffix in both `CallerReference` and `Name` on
`CloudFrontSigningPublicKey` in `serverless.ts` (CloudFront treats those as the identity of an
existing key and refuses to change its material in place). Then redeploy. Cookies signed with the
old key stop working, so viewers reload the watch page once.

### Restore the table from PITR

Point in time recovery is on. Restore to a new table, verify it, then repoint `TABLE_NAME`:

```sh
aws dynamodb restore-table-to-point-in-time \
  --source-table-name demo-hub-dev-data \
  --target-table-name demo-hub-dev-data-restore \
  --restore-date-time 2026-08-18T09:00:00Z
```

The restored table has no GSI unless you pass `--global-secondary-index-override`, so recreate
`GSI1` on `GSI1PK`/`GSI1SK` with an `ALL` projection before pointing the app at it.

### Someone signed in with Google and with a password and now has two accounts

Expected. Auth0 issues a different `sub` per connection, so the two logins are two different users
and only whichever claimed the invite first has access. Either invite the second address as well,
or delete the unwanted `USER#{sub}` item and tell the person which method to use.

## Costs

The stack is designed to run under $5 a month, with no always-on component. A bill above $10 means
one of the constraints in
[`docs/decision/04-demo-video-platform.md`](../../docs/decision/04-demo-video-platform.md) has been
violated, most likely a VPC-attached Lambda, a NAT gateway, or a load balancer.
