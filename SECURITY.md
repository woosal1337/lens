# Security and privacy

Lens processes Instagram exports in the browser. It does not send export contents to the site owner, Meta, or another service.

## What crosses the network

The hosted site downloads its HTML, scripts, styles, and fonts. The host can log the visitor's address, browser details, requested paths, and request times. These requests do not contain export files. Instagram profile links and GitHub source links open only when the reader selects them, without a referrer.

Package installation downloads dependencies. Development uses a local hot-reload connection. The build and development commands disable Next.js telemetry. For offline use, install dependencies first, build Lens, and run `npm start` locally.

## Data lifetime

The worker parses JSON and keeps message bodies in memory. Views request summaries and message rows as needed. Folder imports retain media file handles. Zip imports extract files in a separate worker, then terminate that worker.

Closing an export terminates its parser worker and releases the media URLs. Reloading or closing the tab ends the session. Lens stores only the theme choice in browser storage. It does not use cookies, an export database, analytics, or a service worker.

CSV files and image cards remain on disk when the reader downloads them. CSV files can contain names, messages, contacts, and other private records. Cards omit names but still reveal account statistics. The operating system, browser extensions, screenshots, and downloaded files are outside the app's memory controls.

## Production controls

The production Content Security Policy blocks connection APIs, forms, embedded frames, plugins, and base URL changes. Images and media use local assets or browser blob URLs. Scripts and fonts load from the same origin.

Inline scripts remain necessary for the Next.js static export. Inline styles support the interface. These exceptions weaken protection against injected code. The policy is one layer of defense, not proof against a compromised host or a malicious application change.

The build writes `out/_headers`. It adds frame protection, a no-referrer policy, MIME type protection, and disabled camera, microphone, and location permissions. The local production server sends these headers. A host must apply the same headers to HTML, JavaScript, and error responses. A CSP meta tag cannot apply `frame-ancestors`.

## Import limits

Zip imports accept at most 50,000 entries and 512 MB of extracted files across all selected archives. JSON files have a 128 MB limit. For larger media exports, extract the archives first and choose the folder. Available browser memory can impose a lower limit.

Malformed JSON, duplicate normalized JSON paths, and incomplete selected ZIP entries fail the import. Missing files and empty files remain distinct. Comparisons require the same account, relationship coverage, and different completed export dates. An absent account can reflect deletion, renaming, blocking, or an unfollow. The export does not prove why it disappeared.

## Report a vulnerability

Use GitHub's private vulnerability reporting feature when the repository enables it. Include a small synthetic example and steps to reproduce the issue. Do not attach an Instagram export, a password, a session cookie, or private message content to a public issue.

## Checks

Run `npm run verify`, `npm run build`, `npm run check:build`, and `npm audit`. The pre-commit hook runs the source and build checks. Continuous integration also checks dependency advisories.

The comment check covers project code, tests, scripts, styles, and configuration. Generated files and installed dependencies are outside that rule. The release check blocks known local files and unreviewed public assets. It supplements manual review and does not replace a full secret scanner.
