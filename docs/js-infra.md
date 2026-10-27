# JS infrastructure

## Repo structure

The monorepo contains projects `packages` and `apps`.
Typically, but not necessarily, `packages` have plain `.js` and `.d.ts` files as their build output, while `apps` have other things such as a bundled JS file, or web assets. `apps` tend to deviate from the default configuration more often than `packages`.
The only key distinction (essentially the definition) that must always hold true is that `apps` are not depended on by other `packages` or `apps`, while `packages` are (presently or intended to in the future)
There are also `@types` for when a package neither provides its own type definitions nor has `@types` available on the NPM registry.

## Dependency installation

Many packages have their useless `postinstall` steps disabled in `dependenciesMeta` so that we can benefit from Yarn's zero install feature and not even have to run a dependency installation script before running most scripts. For `serverless`, due to its weird plugin system, a workaround is in use to achieve this, see the `serverless` directory.

The root and some projects contain `patches` applies to some broken dependencies using the `patch:` protocol that Yarn supports.

## TypeScript / Babel

TypeScript is used only for typechecking, while Babel is used for the actual compilation.
The reasons for this are

- that Babel allows specifying more precise target platforms using Browserslist,
- that Babel allows custom plugins, such as for CSS-in-JS or inlining environment variables, and
- that Babel is much faster, so even when you have typecheck running in parallel, you get faster feedback.

Because TypeScript itself does not auto-detect all projects that are part of the workspace, the `get-composite-ts-projects` script does it. It also checks whether any `tsconfig` `references` are missing to avoid confusing errors or out-of-order typechecking later on.

Projects usually inherit their TypeScript and Babel configurations from the config files in the root, but may override things if necessary.
Most notably, some are excluded from the TypeScript multi-project setup using `composite: false`, because `create-react-app` does not allow `composite` projects. These projects then have their own `typecheck` script that is run separately from the root typecheck.
Projects usually specify the shared `build-babel.sh` script as their build step.
Some do not specify Babel as their build step, for example because they only run a script from `react-scripts` as a build step instead.

We build both CJS and ESM, the former e.g. for running in Node environments, the latter e.g. for Webpack bundling with smaller resulting bundle sizes.

## Jest / ESLint

The root Jest project ignores all test files. Instead, there are Jest projects for each project, run together in the same Jest instance.
ESLint is also run in Jest via `jest-runner-eslint` to benefit from e.g. Jest watch mode features.
The `jest` directory contains the configuration and scripts to automatically generate a Jest config for each project, and e.g. determine whether it needs a DOM or Node environment.
Projects can have their own `jest.config.js`, completely replacing the default one and also making it their responsibility to inherit from the base config.

There are some special `jest-*.config`s in the root or in projects, which run test files with a name matching their particular pattern.

## Task orchestration (Turbo)

[Turborepo](https://turborepo.dev) (**2.x**) orchestrates the `build`, `build:babel`, `typecheck`, `test`, and `test:coverage` tasks across the workspace, caching outputs in `.turbo/`. The task graph lives in the root `turbo.json` under the `tasks` key (this was `pipeline` in Turbo 1.x — renamed in the 2.0 upgrade). `build:typecheck:tsc` is a root-only task (the `//#` prefix), and `topo` is a synthetic task used only to enforce topological ordering for `test`.

The cached tasks (`build:babel`, `build`) exclude `build/**/*.d.ts` and `build/**/*.d.ts.map` from their `outputs`. Babel emits `.js` into `build/`, but the TypeScript declarations in that same directory are owned by `//#build:typecheck:tsc`, which is `cache: false` and always regenerates them. If `build:babel` cached the `.d.ts` files, a babel cache hit would restore a stale declaration on top of the fresh one, producing phantom "has no exported member" typecheck errors in downstream packages. Keep declarations out of the cached task outputs — only the `cache: false` typecheck task should manage them. (`turbo.json` does not allow comments, which is why this is documented here.)

`turbo.json` sets `"envMode": "loose"` on purpose. Turbo 2.x defaults to **strict** env mode, where only env vars declared in a task's `env`/`passThroughEnv` (plus a small built-in passlist) reach the task process. Several tasks here depend on ambient env passthrough — most notably `build:babel`, which runs `babel-plugin-transform-inline-environment-variables` to inline `VITE_APP_*` (and similar) values at compile time. Under strict mode those undeclared vars would be stripped and inlined as `undefined`, silently corrupting build output. Loose mode preserves the Turbo 1.x behaviour. To move to strict later, declare the needed vars per task (`passThroughEnv` for `VITE_APP_*` on the frontend build, `VITE_APP_ENVIRONMENT` on `build:babel`) and then drop `envMode`.

All CLI invocations (`--filter`, `--only`, `--cache-dir`, `--dry-run=json`) are unchanged from v1 — none of the removed v1 flags (`--scope`, `--since`) were in use.

### `--affected` in CI

On pull requests, the test matrix (`.github/scripts/manage-workflows/create-test-matrix.js`) runs `turbo test --affected`, so only packages touched by the diff — plus their dependents — are tested, rather than the full ~36-package suite. The script gates this on `GITHUB_BASE_REF` (set on `pull_request` events); pushes to a branch still run the full suite so the coverage baseline stays complete. If a PR touches no testable package (docs/CI only), the affected set is empty and the script falls back to the full suite so the downstream coverage-merge and Codecov jobs always have artifacts. The `setup-turbo` checkout uses `fetch-depth: 0` because `--affected` needs full git history to diff against the base branch. Turbo auto-detects the PR base in GitHub Actions; locally you can override the range with `TURBO_SCM_BASE` / `TURBO_SCM_HEAD`.

## Known bundle issues

### `react-router` pulled into the server bundles

The server Lambda bundles (`crn-server`, `gp2-server`) include `react-router`
(~180 KB) even though no backend code uses routing. It enters via
`@asap-hub/routing`: server controllers import route constants
(`events`, `network`, …) from that package, but its entry (`packages/routing/src/index.ts`)
imports `useLocation`/`useParams` from `react-router` at the top level. Because
the package is consumed as CJS, the eager `require('react-router')` is not
tree-shaken, so the whole module is bundled.

To fix, split the pure route-path builders from the React-hook helpers in
`@asap-hub/routing` (or expose them via a subpath the server can import without
transiting the React imports). Deferred — it touches a shared package consumed
by the frontend, components, and server, so it warrants its own change.
