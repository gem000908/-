import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const importPattern = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["'];?\s*$/gm;

export async function buildSingleFile({
  rootDir = process.cwd(),
  entryHtml = "index.html",
  outputFile = resolve(rootDir, "dist", "记账本.html")
} = {}) {
  const absoluteRoot = resolve(rootDir);
  const absoluteEntryHtml = resolve(absoluteRoot, entryHtml);
  const absoluteOutputFile = isAbsolute(outputFile) ? outputFile : resolve(absoluteRoot, outputFile);
  const html = await readFile(absoluteEntryHtml, "utf8");
  const cssHref = getSingleAttribute(html, /<link\b[^>]*rel=["']stylesheet["'][^>]*>/i, "href");
  const scriptSrc = getSingleAttribute(html, /<script\b[^>]*type=["']module["'][^>]*><\/script>/i, "src");

  if (!cssHref) throw new Error("Could not find a stylesheet link in index.html");
  if (!scriptSrc) throw new Error("Could not find a module script in index.html");

  const cssFile = resolve(dirname(absoluteEntryHtml), cssHref);
  const scriptFile = resolve(dirname(absoluteEntryHtml), scriptSrc);
  const css = await readFile(cssFile, "utf8");
  const js = await bundleLocalModules(scriptFile, absoluteRoot);

  const outputHtml = html
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/i, `<style>\n${escapeStyleText(css)}\n</style>`)
    .replace(/<script\b[^>]*type=["']module["'][^>]*><\/script>/i, `<script type="module">\n${escapeScriptText(js)}\n</script>`);

  await mkdir(dirname(absoluteOutputFile), { recursive: true });
  await writeFile(absoluteOutputFile, outputHtml, "utf8");
  return absoluteOutputFile;
}

async function bundleLocalModules(entryFile, rootDir) {
  const seen = new Set();
  const chunks = [];

  async function visit(file) {
    const absoluteFile = resolve(file);
    if (seen.has(absoluteFile)) return;
    seen.add(absoluteFile);

    const code = await readFile(absoluteFile, "utf8");
    const imports = [...code.matchAll(importPattern)].map((match) => match[1]);
    for (const specifier of imports) {
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
        throw new Error(`Only local module imports can be bundled: ${specifier}`);
      }
      const dependency = resolve(dirname(absoluteFile), specifier);
      if (!dependency.startsWith(rootDir)) {
        throw new Error(`Refusing to bundle a file outside the project: ${dependency}`);
      }
      await visit(dependency);
    }

    chunks.push(stripModuleSyntax(code));
  }

  await visit(entryFile);
  return chunks.join("\n\n");
}

function stripModuleSyntax(code) {
  return code
    .replace(importPattern, "")
    .replace(/^\s*export\s+(?=(const|let|var|function|class)\s+)/gm, "")
    .replace(/^\s*export\s*\{[^}]+\};?\s*$/gm, "");
}

function getSingleAttribute(html, tagPattern, attribute) {
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1] || null;
}

function escapeStyleText(value) {
  return value.replaceAll("</style", "<\\/style");
}

function escapeScriptText(value) {
  return value.replaceAll("</script", "<\\/script");
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const outputFile = await buildSingleFile();
  console.log(`Single-file ledger written to ${outputFile}`);
}
