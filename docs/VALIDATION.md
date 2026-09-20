# Validation record

## GitHub Pages publication — 20 September 2026

The initial successful publication is commit `5b4bfd26c599e42a483699907d782b84c16d318c`, validated by [workflow run 35537862019](https://github.com/wieslawsoltes/VeyraStudio/actions/runs/35537862019). Later documentation and distribution refreshes are revalidated by the same publication workflow.

### Automated checks

- **39 Node tests passed**: editing/history, keyframes, validator repair, object merging, collaboration save/upload concurrency, authorization, database operations, browser-local project/media storage, revision conflicts, static build paths, and playback timing boundaries.
- **19 browser assertions passed before deployment and on the public Pages site**: sample media decode, six editable clips, the seven workspaces and return to Edit, splitting, undo, markers, media persistence, reopening in another tab, cross-tab revision synchronization, actual video recording/decode, no JavaScript page errors, and no server API calls in the static edition.
- The post-deployment check verified the expected public build commit and every static file's HTTP response, byte count and SHA-256 hash.
- All five standalone packages were built. Isolated imports were also checked locally, including the browser and server collaboration entry points.

### Export and visual inspection

The live-site browser test recorded a 320×180 VP8/Opus WebM from a 1.25-second sample timeline and waited for a presented decoded video frame before checking pixels. The artifact contained 68,847 bytes in the initial live run. The test also checks that its recorded-file transfer preserves every byte; codec MIME parameters can contain commas and must not be parsed as the data-URL payload separator.

The downloaded WebM was independently opened with FFprobe/FFmpeg: it contained a VP8 video stream at the expected dimensions and an Opus audio stream. An independently decoded middle frame displayed the coastal image. Decoded mono audio had 60,480 samples, RMS approximately 0.00707 and peak approximately 0.03472. These measurements establish non-silent sample output, not professional audio or synchronization qualification.

Desktop (1440×1000) and narrow-screen (390×844) screenshots were captured and inspected. This is a limited visual smoke check, not exhaustive interaction or accessibility coverage.

### Bug fixed during publication

Playback could pause immediately at timeline zero because a queued `requestAnimationFrame` timestamp can be older than the `performance.now()` value captured when playback starts. The clock now rejects negative deltas and remains monotonic. Regression tests cover this ordering and reverse playback reaching the start boundary.

## Reproduce

```sh
node --test tests/core/*.test.mjs
node scripts/package-libraries.mjs
node scripts/build-pages.mjs
```

Browser tests use Playwright from an isolated installation. Set `PLAYWRIGHT_MODULE` to its `index.mjs` and optionally `PLAYWRIGHT_EXECUTABLE` to a Chrome/Chromium executable, then run `node tests/browser/smoke.mjs`. Set `VEYRA_TEST_URL` for a deployed site. The CI workflow supplies these values and bounds browser execution time.

## Qualification boundaries

The automated browser tests force the **Canvas 2D fallback**. Physical-GPU WebGPU validation, Safari/Firefox parity, exhaustive import/export codecs, long-form synchronization, calibrated color/HDR, native Resolve interchange, professional audio accuracy, enterprise collaboration, accessibility auditing and production-scale performance were not qualified here.

The hosted framework/Cloudflare adapter was retained from the original source but was not rebuilt or redeployed as part of Pages publication. The GitHub Pages edition is browser-local; it does not run the server-backed multi-user service. The local Node server uses a loopback-only local owner identity.

Full DaVinci Resolve feature and UI parity remains unfinished.
