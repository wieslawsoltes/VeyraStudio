# Veyra Studio

A plain HTML and JavaScript video editing workspace with reusable ES modules, a WebGPU color pipeline, multitrack editing, browser media decoding, Web Audio mixing, shared projects, and real-time video export.

**This is version 0.1.0: a working browser implementation, not complete DaVinci Resolve parity or a production-qualified finishing system.** Read [CAPABILITIES](docs/CAPABILITIES.md) for the exact boundaries.

## GitHub Pages

**[Open the public editor](https://wieslawsoltes.github.io/VeyraStudio/)**

The Pages edition stores projects and imported media **in IndexedDB in this browser**, not on a server. Use Ctrl/Command+S or File > Save project to create a persistent local project. Later edits autosave. Project IDs, media blobs, and revisions survive reloads. Other tabs in the same browser profile receive revision-checked updates with the existing four-second polling/merge engine.

The **Local workspace** dialog deliberately does not offer online invitations: GitHub Pages does not run the database/authentication/media API. Multi-user collaboration remains available in the separately hosted server edition. Clearing browser site data removes local projects and media. Project-file downloads contain edit decisions and references, not embedded media: retain original media and relink when moving to another browser/device.

Build the static edition without installing dependencies:

```sh
node scripts/build-pages.mjs
python3 -m http.server 8080 --directory dist/pages
```

Open http://localhost:8080. The build is relocatable under `/VeyraStudio/` or another subpath. The original server entry point is not overwritten. Regular pushes to `main` validate the engine, packages, browser workflows, and static build before deployment; a post-deploy browser check verifies the public site.

## Run the complete app locally

Install **Node.js 22.13 or newer**, extract this repository, and run:

```sh
node server/local.mjs
```

Open **http://localhost:8080**. No dependency installation is needed for this local mode. It serves the plain HTML/JS application, persists projects in SQLite, and stores uploaded media on disk. It binds to loopback and uses one local owner identity. It is not a multi-user internet authentication server. Set `VEYRA_PORT` to change the port. Data is stored in `.veyra-data/` next to the repository; preserve that directory to keep your local projects.

The app opens an editable sample, **North of everywhere**: animated coastal stills, two titles, keyframes, and an original ambient score. This is a still-image edit, not a demonstration of decoded moving footage. Import your own video to edit moving footage.

## Editing workflow

1. Use **Import media** or drop files in the Media pool. Browser-supported video, audio, and image files are accepted, up to 100 MB each for cloud upload.
2. Click a source to inspect it. Double-click to append, or drag it onto a timeline track. Source I/O points constrain the appended range.
3. Move clips, drag their edges to trim, use **B** for the blade, or **Ctrl/⌘ B** to split at the playhead. Use selection, duplicate, delete, ripple delete, markers, snapping, and undo/redo.
4. Adjust the selected clip in **Inspector**. Transform, opacity, gain and pan can have keyframes. Add a title with **T** in the timeline toolbar and edit its text, font, color and size.
5. Use **Color** for primary adjustments, wheels and a live RGB histogram. Use **Fusion** for a small processing chain with Color, Blur and Monochrome nodes. Use **Audio** for clip fades, track gain, mute/solo, shelf EQ and master output.
6. **Save project** writes the project and source media to the server. Hosted collaborators join using a code supplied by the owner and must also have access to the hosted site.
7. **Deliver** records the timeline in real time, including mixed audio, into a browser-supported WebM or MP4 file. Keep the tab visible. Rendering can be cancelled; the result is a downloadable video. Large renders need sufficient browser memory.

Project downloads contain edit decisions and source references, not embedded video. Source blobs that have not been uploaded need relinking after reopening. Private hosted media requires authentication to its original project; project JSON is not a portable media archive. EDL export contains basic video cuts and timing. SRT export derives subtitle cues from title clips.

## Standalone libraries

The five authoring modules are in `public/studio/packages/` and use no UI framework:

| Package | Purpose |
| --- | --- |
| `@veyra/core` | Timeline document, transactions, validation, selection, history, trims, splits, animation interpolation, merge, EDL and SRT |
| `@veyra/renderer` | WebGPU/WGSL grading, canvas scene composition, playback, capture and export |
| `@veyra/media` | Browser decoders, waveform analysis, media lifetime and Web Audio graph |
| `@veyra/controls` | Framework-independent timeline control, safe text escaping and waveform SVG |
| `@veyra/collaboration` | Revision synchronization, conflict handling and a portable server handler |

Build independent npm tarballs with:

```sh
node scripts/package-libraries.mjs
```

They are written to `releases/veyra-*.tgz`. Each package includes any required shared core source internally and can be installed separately. They do not import the application. Renderer and controls require browser APIs; core and the portable server can run in Node. Prepared tarballs are available in the GitHub Actions build artifacts; `standalone-packages/` contains the initial publication builds.

See [API documentation](docs/API.md), [architecture](docs/ARCHITECTURE.md), and [capability matrix](docs/CAPABILITIES.md). These are versioned package builds, not claims of npm registry publication or mature API compatibility with another product.

## Hosted build

The plain application lives in `public/studio/`. A minimal Vinext/Cloudflare adapter redirects `/` to the app and provides `/api/studio` and `/api/media`. This hosted adapter uses the scaffold's dependencies; the browser editor itself has no React dependency.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Hosting declares logical `DB` and `BUCKET` bindings in `.openai/hosting.json`. D1 schema changes use generated Drizzle migrations in `drizzle/`; media bytes are stored separately. Hosted authentication uses the dispatcher-provided user identity. Every project and media operation checks membership server-side. Do not expose the hosted adapter directly to an untrusted proxy that lets clients forge identity headers.

## Verification

```sh
node --test tests/core/*.test.mjs
```

The included automated tests cover timeline/history behavior, split and trim keyframes, node cloning, merge conflicts, in-flight save/upload races, mixer initialization, persistent SQL operations, authorization, invitations, comments, and media access. See [VALIDATION](docs/VALIDATION.md) for verification performed and not performed.

## License and assets

Original application and library code is MIT licensed. Third-party scaffold dependencies retain their licenses. The sample coastline was generated for this project; the score was synthesized for it. For the public repository and Pages demo, the original full-resolution coastline is encoded as AVIF and the 24-second score as Opus to reduce transfer size. These are lossy demo-media conversions, not changes to user import/export formats. Original PNG/WAV media remain in the original source archive. Product names used in documentation identify the workflow reference only. No original application's proprietary code, icons, branding, or native project-format implementation is included.
