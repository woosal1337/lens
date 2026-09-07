import { readFileSync, globSync } from "node:fs";

const TOKEN_FILES = ["styles/tokens.stylex.ts"];
const files = ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"]
  .flatMap((glob) => globSync(glob))
  .filter((file) => !TOKEN_FILES.includes(file));

const RULES = [
  { name: "hex colour", test: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "raw px value", test: /["'`]\d+px["'`]|:\s*\d+px/ },
  { name: "raw rem value", test: /["'`][\d.]+rem["'`]/ },
  { name: "background shorthand", test: /(^|[{,\s])background:\s/ },
  { name: "border shorthand", test: /(^|[{,\s])border:\s/ }
];

const failures = [];

for (const file of files) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (line.includes("@media") || line.includes("var(--color-")) return;
      for (const rule of RULES) {
        if (rule.test.test(line)) {
          failures.push(`${file}:${index + 1}  ${rule.name}  ${line.trim().slice(0, 60)}`);
        }
      }
    });
}

if (failures.length > 0) {
  console.error(
    `${failures.length} raw values found. Every value comes from styles/tokens.stylex.ts.`
  );
  failures.slice(0, 30).forEach((line) => {
    console.error(`  ${line}`);
  });
  process.exit(1);
}

console.log(`No raw colour or size values in ${files.length} source files.`);
