import { readFileSync, globSync } from "node:fs";
import { securityHeaders } from "./security-policy.mjs";

const pages = globSync("out/**/*.html");
const failures = [];
const expected = securityHeaders["Content-Security-Policy"].replace("; frame-ancestors 'none'", "");
if (pages.length === 0) failures.push("No built pages. Run npm run build first.");
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const tag = /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i.exec(html);
  const policy = tag?.[1]
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
  if (policy !== expected) failures.push(`${page}: the production policy is missing or changed.`);
  if (!/^out\/(?:index|404|404\/index|preview\/index)\.html$/.test(page))
    failures.push(`${page}: unexpected route in the public build.`);
}
const headers = readFileSync("out/_headers", "utf8");
for (const [name, value] of Object.entries(securityHeaders)) {
  if (!headers.includes(`  ${name}: ${value}\n`)) failures.push(`out/_headers: missing ${name}.`);
}
for (const file of globSync("out/**/*.map"))
  failures.push(`${file}: source map in the public build.`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Production policies and route allowlist pass on ${pages.length} pages.`);
