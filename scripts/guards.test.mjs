import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

function check(script, files) {
  const root = mkdtempSync(join(tmpdir(), "lens-guard-"));
  try {
    execFileSync("git", ["init", "--quiet", root]);
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(resolve(target, ".."), { recursive: true });
      writeFileSync(target, content);
    }
    return spawnSync(process.execPath, [resolve("scripts", script)], {
      cwd: root,
      encoding: "utf8"
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("comments in tests, JSX, CSS, and root configuration fail", () => {
  for (const [path, content] of Object.entries({
    "root.mjs": "const value = 1; /* hidden */",
    "lib/example.test.ts": "// eslint-disable-next-line\nconst value = 1;",
    "app/example.tsx": "const view = <p>{/* hidden */}</p>;",
    "styles/site.css": "p { /* hidden */ color: red; }"
  })) {
    const result = check("check-no-comments.mjs", { [path]: content });
    assert.equal(result.status, 1, `${path}: ${result.stdout} ${result.stderr}`);
    assert.match(result.stderr, new RegExp(path.replaceAll(".", "\\.")));
  }
});

test("comment-like strings and regular expressions pass", () => {
  assert.equal(
    check("check-no-comments.mjs", {
      "root.mjs":
        'const url = "https://example.test"; const block = "/* text */"; const regex = /https?:\\/\\//;'
    }).status,
    0
  );
});

test("network guard rejects domain suffixes, aliased fetch, peer connections, and CSS imports", () => {
  for (const [path, source] of Object.entries({
    "app/one.ts": 'const url = "https://www.instagram.com.evil.test/";',
    "app/two.ts": "const send = globalThis.fetch;",
    "lib/peer.ts": "const peer = new RTCPeerConnection();",
    "styles/site.css": '@import "//example.test/style.css";'
  })) {
    assert.equal(check("check-no-network.mjs", { [path]: source }).status, 1, path);
  }
});
