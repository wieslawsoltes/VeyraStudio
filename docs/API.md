# Veyra library API

All core time values use seconds. Project frames per second are integer values. The editor quantizes drag movement to timeline frames; other numeric changes retain their supplied precision. Document schema version is `1`.

```js
import { ProjectStore, newProject, createClip } from './packages/core/index.js';
const project = newProject('My film');
const media = { id: 'clip-1', name: 'Shot 1', type: 'video', url: '/shot.mp4', duration: 12 };
project.media.push(media);
project.clips.push(createClip(media, 'v1', 0));
const store = new ProjectStore(project);
store.addEventListener('change', event => console.log(event.detail.label));
store.select(project.clips[0].id);
store.split(3);
store.updateClip(project.clips[0].id, { scale: 1.2, x: 20 });
store.undo();
```

`ProjectStore` owns validated snapshots and up to 100 undo steps. `transact(label, mutate)` edits a clone and commits only after validation. Failed validation leaves state and history unchanged. `replace` clears selection and history. `select(id, extend)` emits a `selection` event without changing project history. `split`, `trim`, `move`, `remove`, and `duplicate` honor locked tracks. Split/duplicate copy associated effect chains. Split and trim rebase supported clip-local animation. Remote snapshots clear undo history because snapshot history cannot safely be rebased across arbitrary concurrent edits.

The document contains `media`, `tracks`, `clips`, `markers`, and `nodes`. Video tracks render in reverse track-array order, making the first track visually uppermost. Audio mixing uses active video and audio clips unless muted or excluded by solo. Multiple clips may overlap; picture uses normal alpha composition. Clip `in` is a source offset; visible source time is `in + (timelineTime - start) * speed`.

`gradeDefaults()` returns exposure, contrast, saturation, temperature, tint, lift, gamma, gain and vignette. `valueAt(clip, property, timelineTime, fallback)` linearly interpolates keyframes in clip-local time. UI keyframes are supported for position, scale, rotation, opacity, clip gain and pan. Speed is a constant per clip. Color-node parameters override corresponding primary clip-grade properties.

```js
import { MediaLibrary } from './packages/media/index.js';
import { GPURenderer, Playback } from './packages/renderer/index.js';
const library = new MediaLibrary();
await library.preload(store.project);
const renderer = new GPURenderer(document.querySelector('canvas'), library);
console.log(await renderer.initialize()); // WebGPU or Canvas 2D
const playback = new Playback(store, renderer, library);
playback.seek(2);
await playback.play(); // call from a user gesture to unlock audio
playback.pause();
```

`GPURenderer.render(project,time,playing)` composes a frame. `resize`, `histogram`, `snapshot`, and `dispose` manage the output. The GPU grading path uses WGSL and full-screen triangles. Scene composition and text use Canvas 2D; grading on non-WebGPU browsers uses CPU pixel math. This is not a zero-copy video engine. Video seeks are asynchronous and schedule repaint when decoded frames become ready.

`recordingFormats()` reports available MediaRecorder formats. `renderVideo(playback, options)` returns `{blob, extension}` only when recording completes. Options: `width`, `height`, `fps`, `mimeType`, `bitrate`, `signal`, `onProgress`. Keep the document visible. The function changes renderer dimensions while rendering and restores playback position and dimensions after recording. It does not provide offline timestamp-driven encoding, codec licensing, container-remux support, or archival master qualification.

```js
import { Collaboration } from './packages/collaboration/index.js';
const collaboration = new Collaboration(store, { baseURL: '/api/studio' });
await collaboration.create();
await collaboration.save();
await collaboration.comment('Review this cut', playback.time);
```

`Collaboration` uses revision-checked saves, a four-second poll, and three-way object merging. `status`, `presence`, and `conflict` events expose state. Changes to distinct IDs merge. Changes to different fields of the same object still conflict. The UI allows downloading local edits, keeping the shared version, or explicitly writing the local version. This is not CRDT synchronization. `dispose()` stops polling and delayed saves.

The portable `handleStudio(request, {db, objects, user})` server accepts Web Standard Requests and returns Responses. `db` supplies D1-style `prepare().bind().first()/all()/run()` and transactional `batch()`. `objects` supplies R2-style `put()` and `get()`. `user` is a trusted server-authenticated identity `{userId,displayName,email}`. Never accept that identity from arbitrary request JSON. The local runner injects one local user and binds only to loopback.

`TimelineControl(root, store, playback, options)` expects the DOM structure illustrated in `public/studio/index.html`: `#timeline-scroll`, `#timeline-content`, `#track-headers`, `#ruler`, `#track-lanes`, `#playhead`, and `#selection-status`. Its stylesheet is the timeline subset of `style.css`; a standalone copy is included with the packaged controls. Options include `onSelect` and `onAppend`. `setZoom` adjusts pixels per second. The control emits edits through the provided store and owns pointer interaction listeners for its mounted lifetime; the app uses one persistent timeline instance.
