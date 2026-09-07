import { statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = process.env.LENS_EXPORT;
if (!root || !statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
  console.error("Set LENS_EXPORT to your extracted export folder before running this command.");
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "lib/parser/export.test.ts",
    "lib/analysis/tabs.test.ts"
  ],
  { stdio: "inherit" }
);
process.exit(result.status ?? 1);
