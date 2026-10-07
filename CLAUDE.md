# ASAP Hub — monorepo (Yarn workspaces + Turbo)

Two products from one codebase: **CRN** and **GP2**. Each has its own frontend, server, auth-frontend, and messages apps under `apps/`. Shared code lives in `packages/` (`react-components` for CRN UI, `gp2-components` for GP2 UI, `model`, `contentful`, `server-common`, `routing`, `algolia`, …).

- CMS: Contentful (separate CRN and GP2 spaces) · Search: Algolia + OpenSearch · Auth: Auth0 · Infra: Serverless Framework on AWS
- Servers are Express apps wired as `routes → controllers → data-providers` with GraphQL against Contentful.

## Commands

- Dev: `yarn watch` MUST be running for changes in `packages/` to take effect — without it, builds are stale and scripts run against old compiled output.
- Start apps: `yarn start:crn` / `yarn start:gp2` (frontend + backend), `yarn start:storybook`.
- Before every commit, from repo root, in order: `yarn fix:format` → `yarn typecheck` → `yarn lint`. Fix anything found.
- Lint output is huge — filter the first run: `yarn lint 2>&1 | grep -E "FAIL|●" | tail -500`
- Scoped tests: `WORKSPACE_PATH=apps/crn-server yarn test:workspace --testPathPattern="<pattern>" --no-coverage` — singular `--testPathPattern`; Jest 29 silently ignores the plural form and runs the whole workspace (looks like a hang).
- Contentful migrations: `yarn contentful:migration:create:crn|gp2` (+ `dryrun`, `run`, `rollback-migration`). Schema refresh: `yarn contentful:schema:update`.

## Conventions

- Commits: short, clear, imperative subject; no ticket prefix; no Co-Authored-By; one commit per distinct fix — never vague meta-commits. Commit locally only; humans push.
- No code comments unless genuinely non-obvious (the "why", never the "what").
- No inline dynamic imports in type annotations — use top-of-file `import { Type } from 'pkg'`.
- Tests assert behaviour and content, not raw CSS values.
