# Deploy Lens

## Build the static site

1. Use Node 24 LTS and run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. This value is public.
4. Run `npm run verify`, `npm run build`, and `npm run check:build`.
5. Publish only the contents of `out/` at the domain root.

Do not deploy the repository root, a Next.js server, or the development server. Do not place export data in `public/` or any deployed directory. The application needs no runtime secrets, database, or API service.

## Set the response headers

The build creates `out/_headers` for hosts that support that format. Other hosts must copy its values into their response-header configuration. Apply the headers to every response, including worker scripts and error pages.

The CSP meta tag protects page content. Frame protection requires an HTTP header. Keep `connect-src 'none'` in production. Do not add analytics, remote fonts, injected scripts, or script rewriting at the host.

Serve the domain over HTTPS. Static hosts can record access logs even though Lens sends no export contents. Disable optional analytics and set a suitable access-log retention period.

## Check the deployed domain

1. Inspect the response headers for `/`, `/preview/`, a worker script, and a missing path.
2. Open the demo and check the charts, message search, and media viewer.
3. Import a small synthetic folder and zip while the browser Network panel is open.
4. Confirm that requests contain no export data and no third-party resources load.
5. Confirm that the canonical URL and share image use the final domain.

The repository checks cannot prove the live host uses the right settings. Repeat this check after a host or build configuration change.

## Run a local copy

Run `npm ci`, `npm run build`, and `npm start`. Open `http://127.0.0.1:4174`. The included server sends the security headers and accepts local connections only. It does not accept uploads.

Once dependencies are installed and the build exists, this path needs no internet connection. Opening `out/index.html` directly as a file is unsupported because browser workers need an HTTP origin.
