#!/usr/bin/env node
/**
 * Generates `src/theme/tokens.generated.ts` from the design system's CSS tokens.
 *
 * The web app is the single source of truth for the design system: every
 * colour, radius, space step and motion curve lives in `globals.css`. The
 * Android app must not introduce a second palette, so the values are extracted
 * mechanically and only the *semantic naming* layer (`src/theme/tokens.ts`) is
 * hand-written.
 *
 *   node scripts/sync-tokens.mjs          # regenerate
 *   node scripts/sync-tokens.mjs --check  # fail if the checked-in file is stale
 *
 * `design/globals.css` is a vendored snapshot of the web app's
 * `frontend/src/app/globals.css`. When the web tokens change, copy the file in
 * and re-run the sync — that copy is the only manual step, and `tokens:check`
 * is what keeps the app honest about it.
 *
 * Inside the monorepo the live file is used instead, so a contributor working
 * on both can still sync without copying.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

// Vendored snapshot first; the monorepo path is the fallback for local work.
const candidates = [
  resolve(projectRoot, "design/globals.css"),
  resolve(projectRoot, "../frontend/src/app/globals.css"),
];
const cssPath = candidates.find((candidate) => existsSync(candidate));

if (!cssPath) {
  console.error(
    `globals.css not found. Looked in:\n  ${candidates.join("\n  ")}\n` +
      "Copy the web app's frontend/src/app/globals.css to design/globals.css.",
  );
  process.exit(1);
}

const outPath = resolve(projectRoot, "src/theme/tokens.generated.ts");

const css = readFileSync(cssPath, "utf8");

/** Extracts the body of a top-level CSS rule whose selector matches exactly. */
function blockBody(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`Selector ${selector} not found in globals.css`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`Unterminated block for ${selector}`);
}

/** Parses `--name: value;` declarations, ignoring comments. */
function declarations(body) {
  const out = {};
  for (const line of body.split("\n")) {
    const clean = line.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!clean.startsWith("--")) continue;
    const colon = clean.indexOf(":");
    if (colon === -1) continue;
    const name = clean.slice(2, colon).trim();
    const rawValue = clean.slice(colon + 1).replace(/;\s*$/, "").trim();
    if (!name || !rawValue) continue;
    out[name] = rawValue;
  }
  return out;
}

const light = declarations(blockBody(css, ":root {"));
const dark = declarations(blockBody(css, '[data-theme="dark"] {'));

/**
 * Colours are the only values that differ per theme, so the generated file
 * keeps one colour map per theme and one shared map for geometry and motion.
 * Values are emitted verbatim (hex, rgba, space separated rgb triplets) — the
 * theme layer decides how to consume each shape.
 */
const isColor = (name) =>
  name.startsWith("color-") || name === "shadow-color";

const shared = {};
const colors = { light: {}, dark: {} };

for (const [name, value] of Object.entries(light)) {
  const key = name.replace(/^--/, "");
  if (isColor(name)) colors.light[key] = value;
  else shared[key] = value;
}

for (const [name, value] of Object.entries(dark)) {
  const key = name.replace(/^--/, "");
  if (isColor(name)) colors.dark[key] = value;
  else if (!(key in shared)) shared[key] = value;
}

// Some tokens are theme-invariant on purpose: `inverse-surface` and friends are
// the intentionally-dark panels (photo scrims, tooltips) that must stay dark in
// both themes, so the dark block does not restate them. Those inherit the light
// value. A token that exists *only* in dark is still an error — that direction
// has no sane fallback.
for (const key of Object.keys(colors.light)) {
  if (!(key in colors.dark)) colors.dark[key] = colors.light[key];
}
const themeInvariant = Object.keys(colors.light).filter(
  (k) => colors.light[k] === colors.dark[k],
);
const missingInLight = Object.keys(colors.dark).filter((k) => !(k in colors.light));
if (missingInLight.length) {
  throw new Error(`Tokens present in dark but not in :root: ${missingInLight.join(", ")}`);
}

const sorted = (obj) =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
const literal = (obj) =>
  JSON.stringify(sorted(obj), null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");

const file = `/**
 * GENERATED FILE — do not edit.
 *
 * Source: frontend/src/app/globals.css
 * Regenerate: npm run tokens:sync
 * Verified by: npm run tokens:check (fails when this file is stale)
 *
 * ${Object.keys(colors.light).length} colour tokens x 2 themes,
 * ${Object.keys(shared).length} shared tokens (radius, space, type, motion).
 * ${themeInvariant.length} theme-invariant colours (intentionally dark surfaces).
 */

export const colorTokens = {
  light: ${literal(colors.light)},
  dark: ${literal(colors.dark)},
} as const;

export const sharedTokens = ${literal(shared)} as const;

export type ColorTokenName = keyof typeof colorTokens.light;
export type SharedTokenName = keyof typeof sharedTokens;
`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    current = "";
  }
  if (current !== file) {
    console.error(
      "tokens.generated.ts is stale. Run `npm run tokens:sync` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`tokens.generated.ts is current (${Object.keys(colors.light).length} colours).`);
} else {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, file, "utf8");
  console.log(
    `Wrote ${outPath} — ${Object.keys(colors.light).length} colours, ${Object.keys(shared).length} shared tokens.`,
  );
}
