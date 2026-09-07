import { writeFileSync } from "node:fs";
import { securityHeaders } from "./security-policy.mjs";

writeFileSync(
  "out/_headers",
  `/*\n${Object.entries(securityHeaders)
    .map(([name, value]) => `  ${name}: ${value}`)
    .join("\n")}\n`
);
