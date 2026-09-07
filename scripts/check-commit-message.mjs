import { readFileSync } from "node:fs";

const TYPES = ["feat", "fix", "refactor", "perf", "docs", "style", "test", "build", "chore"];
const pattern = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9-]+\\))?: [a-z].{0,68}$`);

const file = process.argv[2];
if (!file) {
  console.error("No commit message file given.");
  process.exit(1);
}

const subject = readFileSync(file, "utf8").split("\n")[0].trim();

if (subject.startsWith("Merge ") || subject.startsWith("Revert ")) process.exit(0);

if (!pattern.test(subject)) {
  console.error("Commit message rejected.");
  console.error(`  got:    ${subject}`);
  console.error(`  format: <type>(<scope>): <imperative summary>`);
  console.error(`  types:  ${TYPES.join(", ")}`);
  console.error(`  rules:  lower-case start, no full stop, 72 characters maximum`);
  process.exit(1);
}
