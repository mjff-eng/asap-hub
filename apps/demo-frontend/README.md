# Demo hub frontend

Vite and React app for the chaptered demo video platform: a watch page with a chapter list beside
the player, and a studio where creators upload a recording and mark its sections. It is served at
`/` by the same CloudFront distribution as the API; the backend and the operational documentation
live in [`apps/demo-server`](../demo-server/README.md).

## Running it

```sh
yarn start
```

The dev server listens on http://localhost:3500 and proxies `/api` and `/media` to the demo server
on http://localhost:5555, so the browser sees a single origin exactly as it does when deployed. The
backend has to be running for anything past the sign-in screen to work; `yarn start:demo` from the
repo root starts both, and the local setup steps are in the demo server README.

## Configuration

Everything is read from `import.meta.env` at build time in `src/config.ts`, with dev defaults
committed so a clone runs without an `.env` file:

- `VITE_APP_DEMO_API_BASE_URL`, empty by default, meaning same-origin requests through the proxy
- `VITE_APP_DEMO_AUTH0_DOMAIN`, defaults to `dev-asap-hub.us.auth0.com`
- `VITE_APP_DEMO_AUTH0_CLIENT_ID`, defaults to the demo application in that tenant
- `VITE_APP_DEMO_AUTH0_AUDIENCE`, defaults to `https://demos.hub.asap.science`

## Keyboard shortcuts in the studio editor

Active on the chapter editing page whenever focus is not in a text field:

| Key           | Action                         |
| ------------- | ------------------------------ |
| Space         | Play or pause                  |
| `M`           | Mark a chapter at the playhead |
| Left / Right  | Nudge the playhead by 1 second |
| Shift + arrow | Nudge by one frame             |

## Testing

```sh
WORKSPACE_PATH=apps/demo-frontend yarn workspace asap-hub test:workspace --runInBand
```
