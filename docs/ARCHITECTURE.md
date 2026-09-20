# Architecture

The browser starts at `public/studio/index.html`, loads `app.js`, and composes five framework-independent ES modules. The UI uses native HTML, CSS, DOM events and canvases. The hosted root only redirects into this application.

`ProjectStore` owns a serializable schema and snapshot history. Timeline controls send atomic edits to the store. The app binds inspectors, media cards, workspace navigation and project dialogs to the same state. Playback advances on a monotonic browser clock and invalidates the renderer; decoded-video readiness triggers additional repaint. Each active instance of video has its own visual element, so different instances may use different source offsets. Audio voices use a separate Web Audio graph with per-clip gain/pan and track EQ.

The renderer composes scene layers on Canvas 2D. WebGPU grades layers with a WGSL full-screen pass and presents the composed result. A CPU implementation provides basic fallback. Titles are native canvas text. Export captures the same output canvas plus the mixed audio destination with MediaRecorder. It is a wall-clock render, not an offline frame pipeline.

Cloud project requests use a trusted authenticated identity. Membership is checked before loading or mutating a project, posting comments, managing invitations, or reading/writing media. Shared code is hashed before storage. Media paths are looked up from SQL metadata; a client cannot request arbitrary object keys. The deployment remains private unless its owner separately changes site access. An in-app project code does not grant site-level access.

The portable server handler in `packages/collaboration/server.js` holds the API behavior. Thin hosted routes provide D1, R2 and identity. The local Node runner adapts SQLite and filesystem objects to those interfaces. Production schema is migration-owned. The local runner applies the same SQL migrations to its own database.

Collaboration saves use compare-and-swap revisions. If a save is stale, the client merges its current live document against the server document and its prior baseline. Distinct object changes merge. Concurrent modification of one object pauses the save and requires resolution. Uploads install durable URLs into the current live media object after awaiting transfer, preserving edits made during the upload. Remote changes clear snapshot undo history to avoid reverting another user's contributions.

Security scope: project membership and media access are implemented and tested. Public-service rate limiting, large-team administration, antivirus scanning, retention/backup policy, audit trails and external authentication are not implemented. The local runner is a loopback development/workstation app, not an internet multi-user server.
