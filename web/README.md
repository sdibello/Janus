# Janus web

The Vite workspace has two entry pages: `/` for the campaign product and `/portal.html` for shared account access. During development, Vite proxies service health requests to the local ASP.NET Core hosts.

From this directory:

```sh
npm ci
npm run dev
```

The development site uses <http://localhost:5173>. Run the identity host on port 5186 and campaign host on port 5199. `npm run build` creates both pages under `dist/`; `npm run lint` checks the TypeScript source.

The portal provides account and access management. The campaign page supports campaigns, characters, and encounters. During Fight, non-active participants use aligned name/Turn, HP, and action columns; the active participant keeps a separate HP row and Next/Skip controls. The Hold sidebar experiment preserves the participant-list width and adds a 25% Hold column on wide displays, stacking it below on smaller displays. Drag participants into Hold and drag their compact name tiles back out, or select a held name to release it.

Run `npm run test:encounter-flow` against published hosts with a disposable, verified campaign account and an installed Chrome browser. It includes HP column alignment and narrow-screen layout assertions. See [local development](../docs/LOCAL-DEVELOPMENT.md) for environment variables, publishing, other browser checks, and validation status. The new three-column assertions have not yet been run in the current environment.

For the isolated sidebar check, run `npm run build`, then `npm run test:hold-sidebar`. It starts a temporary localhost server for `dist/` and uses fixture API responses; no account or database is needed. Install Playwright Chromium with `npx playwright-core install chromium`, or set `JANUS_TEST_BROWSER_CHANNEL=chrome` (or `msedge`) to use an installed browser.
