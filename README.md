# Veyra Studio

A browser-native video editing, color, compositing and audio workspace. The editor uses plain HTML, CSS and native JavaScript modules. Rendering combines Canvas scene composition with a WebGPU/WGSL color pipeline and a CPU/Canvas fallback.

**[Open the GitHub Pages app](https://wieslawsoltes.github.io/VeyraStudio/)** · [Validation and deployment](https://github.com/wieslawsoltes/VeyraStudio/actions/workflows/publish.yml)

Veyra is an independent application with a Resolve-inspired workspace, not a Blackmagic product. **Full DaVinci Resolve feature and UI parity remains unfinished. This is not a production-qualified replacement.** See [capabilities and limits](docs/CAPABILITIES.md).

## Run locally

Use Node.js 22.13 or newer. The local application has no installation step:

```sh
node server/local.mjs
```

Open **http://localhost:8080**. Projects use SQLite and media files under `.veyra-data/`, which is excluded from Git. This server binds to loopback and uses a single local owner identity; it is not an authenticated public multi-user service.

## GitHub Pages edition

The public site runs entirely in your browser, including editing, rendering and supported video exports. IndexedDB stores projects, revisions, review notes and imported media Blobs. Same-origin tabs in the same browser synchronize through revision-checked polling. Project-relative asset URLs work under `/VeyraStudio/`.

**Pages does not provide remote multi-user collaboration or server authentication.** The server-backed collaboration implementation is included separately for deployment with trusted identities, a database and object storage. GitHub Pages is not a replacement for that backend.

Clearing browser site data deletes browser-local projects and media. Export project JSON and retain the original media as backups. Project JSON does not embed media; moving projects to another browser requires relinking those files.

To build and serve the static edition:

```sh
node scripts/build-pages.mjs
python3 -m http.server 8080 --directory dist/pages
```

Open http://localhost:8080. The static build uses no framework or bundler. The original hosted adapter remains under `app/`, `server/` and the Cloudflare configuration; it is not needed to run Pages or the local Node server.

## Implemented workflows

- Media, Cut, Edit, Fusion, Color, Audio and Deliver workspaces; media pool, viewers, inspector and multitrack timeline, with desktop and narrow-screen layouts.
- Media import, source in/out points, append, clip movement and trimming, splitting, duplication, deletion/ripple deletion, snapping, track locks, markers and undo/redo.
- Editable titles, clip transforms, opacity and linear keyframes; WebGPU or CPU color adjustments, histogram, presets and a limited serial Color/Blur/Monochrome node chain.
- Audio voices, waveforms, gain, pan, fades, track mute/solo and shelf EQ. Real-time MediaRecorder export with mixed audio in browser-supported WebM/MP4 formats; snapshots, basic EDL, SRT and project JSON.
- Server-side project/media membership checks, optimistic revisions, three-way object merging, explicit conflicts, presence and timestamped comments. Server synchronization polls every four seconds; browser-local Pages synchronization is separate.

The coastal sample contains animated stills, titles and a 24-second ambient score. The repository uses optimized AVIF and mono Opus derivatives of the original sample media. This is demonstration media, not a fidelity or codec qualification benchmark. Import your own footage for moving-video editing.

## Reusable packages

| Package | Location | Responsibility |
| --- | --- | --- |
| `@veyra/core` | `public/studio/packages/core/` | Project model, validation, timecode, editing/history, keyframes, EDL/SRT and object merge |
| `@veyra/renderer` | `public/studio/packages/renderer/` | Scene composition, GPU grading, playback and recording |
| `@veyra/media` | `public/studio/packages/media/` | Media loading, metadata, waveform decoding and Web Audio voices |
| `@veyra/controls` | `public/studio/packages/controls/` | Timeline control and parameter fields |
| `@veyra/collaboration` | `public/studio/packages/collaboration/` | Server client, browser storage adapter and portable server handler |

```sh
node scripts/package-libraries.mjs
npm install ./releases/veyra-core-0.1.0.tgz
```

All five independently installable archives are generated under `releases/` and retained in validation artifacts. Checked-in distributions are under `standalone-packages/`; the Refresh standalone distributions workflow rebuilds and commits them without publishing to npm. Packaging vendors internal core imports, so no unpublished sibling dependency is required. See [API contracts](docs/API.md) and [architecture](docs/ARCHITECTURE.md).

## Validation and publishing

```sh
node --test tests/core/*.test.mjs
node scripts/package-libraries.mjs
node scripts/build-pages.mjs
```

The publication workflow runs **39 automated Node tests** and Chromium-based browser workflows before deployment. Browser checks cover all seven workspaces, editing/history, persistent imported media, same-browser cross-tab revision synchronization and a real 320×180 WebM export that is decoded and checked for visible pixels.

After deployment, the workflow verifies the public commit and every static file's byte count and SHA-256 hash, then reruns the browser suite against the live Pages URL. Source ZIPs, standalone archives, screenshots, reports and an exported video are available in workflow artifacts. See [validation record and limits](docs/VALIDATION.md).

Browser validation uses the **Canvas 2D fallback**, not physical WebGPU hardware. It does not establish full native-project compatibility, professional codec coverage, calibrated color/HDR, audio finishing accuracy, deterministic offline output or large-project performance. Those remain separate qualification and implementation work.

## Source recovery

The complete source is checked into this repository. `docs/SOURCE-IMPORT.json` records checksum-verified recovery of the interrupted transfer and the pinned, byte-identical build scaffold. Ordinary builds use only this repository and do not fetch application code from another repository.

## License

MIT. See [LICENSE](LICENSE).
