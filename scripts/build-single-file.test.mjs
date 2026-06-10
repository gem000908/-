import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSingleFile } from "./build-single-file.mjs";

test("buildSingleFile inlines stylesheet and local module graph into one html file", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "single-file-build-"));
  await mkdir(join(rootDir, "src"));
  await mkdir(join(rootDir, "dist"));
  await writeFile(join(rootDir, "index.html"), `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="./src/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
`);
  await writeFile(join(rootDir, "src", "styles.css"), "body { color: #123456; }\n");
  await writeFile(join(rootDir, "src", "answer.js"), "export const answer = 42;\n");
  await writeFile(join(rootDir, "src", "main.js"), `import { answer } from "./answer.js";
document.getElementById("app").textContent = String(answer);
`);

  const outputFile = join(rootDir, "dist", "app.html");
  await buildSingleFile({ rootDir, entryHtml: "index.html", outputFile });

  const html = await readFile(outputFile, "utf8");
  assert.match(html, /<style>\s*body \{ color: #123456; \}\s*<\/style>/);
  assert.match(html, /const answer = 42;/);
  assert.match(html, /document\.getElementById\("app"\)\.textContent = String\(answer\);/);
  assert.doesNotMatch(html, /\bimport\b/);
  assert.doesNotMatch(html, /\bexport\b/);
  assert.doesNotMatch(html, /src="\.\/src\/main\.js"/);
});
