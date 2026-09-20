# GitHub Pages deployment

`node scripts/build-pages.mjs` emits `dist/pages`. It copies only the browser application and favicon, selects the browser storage adapter using a build-time meta marker, and emits a relative root redirect and commit/file-hash manifest. It never publishes API routes, database contents, imported user media, credentials, or server code into the static site. The repository retains the full server implementation.

The browser adapter exports `IndexedDBStorage`, `BrowserDatabase`, `BrowserCollaboration`, and `sanitizeMedia` from `@veyra/collaboration/browser`. Native IndexedDB read-modify-write transactions serialize revision comparison and writes, so two tabs cannot silently overwrite the same revision. Separate objects use the existing three-way merge engine; conflicting objects retain both snapshots for explicit review. This is same-profile, same-origin tab synchronization, not multi-user collaboration or a CRDT service.

Media blobs receive stable `veyra-asset:` IDs. Decoder-only object URLs are cached and revoked by the adapter; they are not written into canonical project documents. Missing assets report a relink instruction. Storage failure does not report success and does not clear dirty state. Browser quota, profile policies, and site-data eviction still apply.

Project imports allow packaged samples, valid browser-local IDs, and generated image thumbnails; unknown external references require explicit relinking rather than silently fetching another server. The source and export library operate without a UI framework. Sample media are full-resolution AVIF and a 24-second Opus score; they are lossy transcodes of the original demonstration assets.

## Tests

`node --test tests/core/*.test.mjs` covers the engine, server, collaboration, browser adapter, and static build. `tests/browser/smoke.mjs` uses Playwright with a fresh browser context, serves the build under `/VeyraStudio/`, checks all workspaces, keyboard split/undo, IndexedDB save/reload/imported media, second-tab synchronization, native IndexedDB compare-and-swap, and real-time WebM encoding followed by decoding. It fails on page exceptions, HTTP errors, unexpected external requests, or server API requests.

Set `PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs` path, or install Playwright in the test runtime. `CHROMIUM_PATH` optionally selects an executable. `VEYRA_TEST_URL` runs the same tests against a deployed site. `VEYRA_TEST_GPU=1` requests software WebGPU through Chromium for development only; this is not physical-GPU qualification.

A successful smoke run is not production codec/color/HDR qualification, an exhaustive accessibility audit, or full feature parity with a desktop finishing application.
