import { securityHeaders } from "./security-policy.mjs";

const policy = securityHeaders["Content-Security-Policy"];
for (const directive of [
  "connect-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:"
]) {
  if (!policy.split("; ").includes(directive))
    throw new Error(`Restore the production directive: ${directive}`);
}
if (policy.includes("'unsafe-eval'"))
  throw new Error("Remove unsafe-eval from the production policy.");
console.log("The production policy blocks connections, frames, plugins, forms, and base URLs.");
