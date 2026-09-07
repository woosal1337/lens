import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const DIRS = ["app", "components", "lib"];
const pattern = DIRS.map((dir) => `${dir}/**/*.{ts,tsx}`);
const files = pattern.flatMap((glob) => globSync(glob));

const TRANSFORM = /textTransform:\s*["']uppercase["']/;
const SHOUTED = />\s*[A-Z][A-Z0-9 ,.'-]{3,}\s*</;

const failures = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (TRANSFORM.test(line) || SHOUTED.test(line)) {
      failures.push(`${file}:${index + 1}  ${trimmed.slice(0, 70)}`);
    }
  });
}

if (failures.length > 0) {
  console.error(`All-capital text found in ${failures.length} places. Use sentence case.`);
  failures.slice(0, 30).forEach((line) => {
    console.error(`  ${line}`);
  });
  process.exit(1);
}

console.log(`No all-capital text in ${files.length} source files.`);
