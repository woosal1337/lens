import { readFileSync, globSync } from "node:fs";

const FORBIDDEN = [
  {
    name: "connection API",
    test: /\b(fetch|XMLHttpRequest|WebSocket|WebTransport|EventSource|sendBeacon|RTCPeerConnection|RTCDataChannel|serviceWorker)\b/
  },
  {
    name: "remote URL",
    test: /["'`](?:https?:)?\/\/(?!www\.instagram\.com(?:[/"'`])|localhost(?::\d+)?(?:[/"'`]))/
  },
  { name: "remote CSS", test: /(?:url\(|@import\s+)[\s"']*(?:https?:)?\/\// },
  { name: "code evaluation", test: /\b(?:eval\s*\(|new\s+Function\s*\()/ }
];
const files = ["app", "components", "lib", "styles"]
  .flatMap((dir) => globSync(`${dir}/**/*.{ts,tsx,js,jsx,mjs,css}`))
  .filter((file) => !file.endsWith(".test.ts"));
const failures = [];
for (const file of files) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const rule of FORBIDDEN) {
        const repositoryLink =
          file === "components/layout/site-frame.tsx" &&
          line === 'const REPOSITORY = "https://github.com/woosal1337/lens";';
        if (rule.test.test(line) && !(rule.name === "remote URL" && repositoryLink))
          failures.push(`${file}:${index + 1}  ${rule.name}`);
      }
    });
}
if (failures.length > 0) {
  console.error(`Remove the network or code evaluation paths:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`No forbidden connection APIs or remote assets in ${files.length} source files.`);
