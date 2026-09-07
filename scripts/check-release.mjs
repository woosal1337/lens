import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter((file) => file.length > 0 && existsSync(file));
const failures = [];
for (const file of files) {
  if (
    /^(?:reference|research|app\/real)\//.test(file) ||
    (/(^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith(".env.example"))
  )
    failures.push(`${file}: local-only file.`);
  if (
    /(^|\/)(?:AGENTS\.md|CLAUDE\.md|PROJECT\.json|\.mcp\.json|\.env(?!\.example$))(?:\/|$)/.test(
      file
    ) ||
    /\.(?:local\.json|zip|pem|key|p12|pfx)$/.test(file)
  )
    failures.push(`${file}: private or local file in release contents.`);
  if (
    file.startsWith("public/") &&
    !/^public\/fonts\/(?:[a-zA-Z0-9-]+\.(?:woff2|txt)|README\.md)$/.test(file)
  )
    failures.push(`${file}: unreviewed public asset.`);
  if (/\.(?:[cm]?[jt]sx?|json|css|md|ya?ml)$/.test(file) && file !== "package-lock.json") {
    const source = readFileSync(file, "utf8");
    if (/\/(?:Users|home)\/[a-z][a-z0-9_-]*\//i.test(source))
      failures.push(`${file}: machine-specific home path.`);
    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[a-z0-9]{30,}|github_pat_[a-z0-9_]{40,}|AKIA[A-Z0-9]{16}/i.test(
        source
      )
    )
      failures.push(`${file}: possible credential. Inspect locally.`);
  }
}
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Release contents pass for ${files.length} project files.`);
