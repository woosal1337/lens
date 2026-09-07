import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/security/csp.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const { contentSecurityPolicy } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

export const securityHeaders = {
  "Content-Security-Policy": `${contentSecurityPolicy(false)}; frame-ancestors 'none'`,
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};
