// Copy reveal.js's reset, core, and white theme CSS from node_modules into vendor/.
// The white theme embeds Source Sans Pro as base64 @font-face rules (about 570 KB);
// the deck uses IBM Plex instead, so those rules are stripped.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const outDir = join(root, "vendor");
mkdirSync(outDir, { recursive: true });

const files = [
  ["reset.css", "reveal.js/reset.css"],
  ["reveal.css", "reveal.js/reveal.css"],
  ["white.css", "reveal.js/theme/white.css"],
];
for (const [name, specifier] of files) {
  const css = readFileSync(require.resolve(specifier), "utf8").replace(/@font-face\{[^}]*\}/g, "");
  writeFileSync(join(outDir, name), css);
}
console.log(`vendored ${files.length} reveal.js stylesheets into vendor/`);
