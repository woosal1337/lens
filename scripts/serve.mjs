import { createReadStream } from "node:fs";
import { stat, realpath } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { securityHeaders } from "./security-policy.mjs";

const root = await realpath("out").catch(() => {
  console.error("No production build exists. Run npm run build first.");
  process.exit(1);
});
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

async function serve(request, response) {
  for (const [name, value] of Object.entries(securityHeaders)) response.setHeader(name, value);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (path.split(/[\\/]/).some((part) => part.startsWith(".") || part === "_headers")) {
    response.writeHead(404).end();
    return;
  }
  let file = resolve(root, `.${path}`);
  let code = 200;
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    file = await realpath(file);
    if (!file.startsWith(`${root}${sep}`) || !(await stat(file)).isFile()) throw new Error();
  } catch {
    file = resolve(root, "404.html");
    code = 404;
  }
  response.writeHead(code, {
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store"
  });
  if (request.method === "HEAD") response.end();
  else
    createReadStream(file)
      .on("error", () => response.destroy())
      .pipe(response);
}

const server = createServer((request, response) => {
  void serve(request, response).catch(() => response.destroy());
});
server.listen(4174, "127.0.0.1", () => console.log("Lens is ready at http://127.0.0.1:4174"));
