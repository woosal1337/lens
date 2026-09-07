import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";
import postcss from "postcss";

const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8"
    }).split("\0")
  )
];
const failures = [];
let checked = 0;

for (const file of files) {
  if (!/\.(?:[cm]?[jt]sx?|css|html|svg|ya?ml|sh)$/.test(file) && !file.startsWith(".husky/"))
    continue;
  checked += 1;
  const source = readFileSync(file, "utf8");
  const positions = new Set();
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      for (const offset of [node.getFullStart(), node.end]) {
        for (const range of [
          ...(ts.getLeadingCommentRanges(source, offset) ?? []),
          ...(ts.getTrailingCommentRanges(source, offset) ?? [])
        ])
          positions.add(range.pos);
      }
      for (const child of node.getChildren(tree)) visit(child);
    };
    visit(tree);
  } else if (file.endsWith(".css")) {
    postcss
      .parse(source, { from: file })
      .walkComments((comment) => positions.add(comment.source.start.offset));
  } else {
    const pattern = /\.(html|svg)$/.test(file) ? /<!--/g : /(?:^|\s)#(?!!)/gm;
    for (const match of source.matchAll(pattern)) positions.add(match.index);
  }
  for (const position of positions)
    failures.push(`${file}:${source.slice(0, position).split("\n").length}`);
}

if (failures.length > 0) {
  console.error(`Remove the comments at:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`No comments in ${checked} project code files, including tests and configuration.`);
