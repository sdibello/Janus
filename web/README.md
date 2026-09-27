# Janus web

The Vite workspace has two entry pages: `/` for the campaign product and `/portal.html` for shared account access. During development, Vite proxies service health requests to the local ASP.NET Core hosts.

From this directory:

```sh
npm ci
npm run dev
```

The development site uses <http://localhost:5173>. Run the identity host on port 5186 and campaign host on port 5199 to see both service checks pass. `npm run build` creates both pages under `dist/`; `npm run lint` checks the TypeScript source.

The pages currently show local service readiness. Account and campaign workflows are the next implementation slices.
