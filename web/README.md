# Janus web

The Vite workspace has two entry pages: `/` for the campaign product and `/portal.html` for shared account access. During development, Vite proxies service health requests to the local ASP.NET Core hosts.

From this directory:

```sh
npm ci
npm run dev
```

The development site uses <http://localhost:5173>. Run the identity host on port 5186 and campaign host on port 5199. `npm run build` creates both pages under `dist/`; `npm run lint` checks the TypeScript source.

The portal provides account and access management. The campaign page supports campaigns, characters, and encounters. During Fight, non-active participants use aligned name/Turn, HP, and action columns; the active participant keeps a separate HP row and Next/Skip controls.

Run `npm run test:encounter-flow` against published hosts with a disposable, verified campaign account and an installed Chrome browser. It includes HP column alignment and narrow-screen layout assertions. See [local development](../docs/LOCAL-DEVELOPMENT.md) for environment variables, publishing, other browser checks, and validation status. The new three-column assertions have not yet been run in the current environment.
