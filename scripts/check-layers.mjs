import { readFileSync, globSync } from "node:fs";

const files = ["lib/**/*.ts", "lib/**/*.tsx"].flatMap((glob) => globSync(glob));
const pattern = /from\s+"@\/components\//;
const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  source.split("\n").forEach((line, index) => {
    if (pattern.test(line)) failures.push(`${file}:${index + 1}  ${line.trim()}`);
  });
}

if (failures.length > 0) {
  console.error(`A file in lib/ imports from components/ in ${failures.length} places.`);
  console.error("lib/ runs in a Web Worker, which has no DOM. A React component breaks it.");
  failures.forEach((line) => {
    console.error(`  ${line}`);
  });
  process.exit(1);
}

console.log(`No component import in ${files.length} library files.`);
