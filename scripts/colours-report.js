#!/usr/bin/env node
// `yarn colours:report`: how product code uses colour, and which CAS roles from
// Figma are not used yet. Set DETAILS=1 to list every hard-coded value.

const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative } = require('path');

const root = join(__dirname, '..');
const sourceDirs = [
  'packages/react-components/src',
  'packages/gp2-components/src',
  'apps/crn-frontend/src',
  'apps/gp2-frontend/src',
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === '__mocks__' ? [] : walk(path);
    }
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name)
      ? [path]
      : [];
  });

const isColourDefinition = (file) =>
  /(^|\/)(colors|theme)\.ts$|cas-tokens\.generated\.ts$/.test(file);
const isArtwork = (file) => /\/(icons|images)\//.test(file);

const colorsSource = readFileSync(
  join(root, 'packages/react-components/src/colors.ts'),
  'utf8',
);
const deprecatedNames = [
  ...colorsSource.matchAll(/@deprecated[^*]*\*\/\s*export const (\w+)/g),
].map(([, name]) => name);

const generated = readFileSync(
  join(root, 'packages/react-components/src/cas-tokens.generated.ts'),
  'utf8',
);
const themeStart = generated.indexOf('export const casTheme');
const crnBlock = generated.slice(
  generated.indexOf('crn: {', themeStart),
  generated.indexOf('gp2: {', themeStart),
);
const allRoles = [...crnBlock.matchAll(/'colour\/([^']+)':/g)].map(
  ([, path]) => path,
);

const rolePattern =
  /\bcolour\.((?:foreground|background|border)(?:\.[A-Za-z0-9]+|\['[^']+'\])+)/g;
const palettePattern = /\bcolour\.(neutral|brand|general|utilitarian)\b/g;
const hardcodedPattern =
  /(?<![\w&])(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*\d)/g;

const toRolePath = (codePath) =>
  codePath.replace(/\['([^']+)'\]/g, '/$1').replace(/\./g, '/');

const count = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);
const top = (map, limit) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
const percent = (part, total) =>
  total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;
const row = (label, value, total) =>
  `  ${label.padEnd(58)} ${String(value).padStart(6)}  ${percent(
    value,
    total,
  ).padStart(4)}`;

let roles = 0;
let palette = 0;
let deprecated = 0;
let hardcoded = 0;
const rolesUsed = new Map();
const hardcodedByFile = new Map();
const deprecatedByFile = new Map();
const details = [];

sourceDirs
  .flatMap((dir) => walk(join(root, dir)))
  .forEach((path) => {
    const file = relative(root, path);
    if (isColourDefinition(file)) return;
    const source = readFileSync(path, 'utf8');
    [...source.matchAll(rolePattern)].forEach(([, codePath]) => {
      roles += 1;
      count(rolesUsed, toRolePath(codePath));
    });
    palette += (source.match(palettePattern) ?? []).length;
    const body = source.replace(/^import[\s\S]*?;$/gm, '');
    deprecatedNames.forEach((name) => {
      const uses = (body.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (uses) {
        deprecated += uses;
        count(deprecatedByFile, `${file} (${name})`, uses);
      }
    });
    if (!isArtwork(file)) {
      source.split('\n').forEach((line, index) => {
        const found = line.match(hardcodedPattern) ?? [];
        if (found.length) {
          hardcoded += found.length;
          count(hardcodedByFile, file, found.length);
          details.push(`  ${file}:${index + 1}  ${found.join(' ')}`);
        }
      });
    }
  });

const total = roles + palette + deprecated + hardcoded;
const unusedRoles = allRoles.filter((path) => !rolesUsed.has(path));
const out = [
  'Colour usage in product code',
  '',
  row('Role names (colour.foreground/background/border)', roles, total),
  row('Palette names (colour.neutral, colour.brand...)', palette, total),
  row(
    `Deprecated names (${deprecatedNames.join(', ') || 'none'})`,
    deprecated,
    total,
  ),
  row(
    'Hard-coded values (hex, rgb; icons and images excluded)',
    hardcoded,
    total,
  ),
  '',
  `CAS roles used: ${rolesUsed.size} of ${allRoles.length}`,
  'Not used yet:',
  ...unusedRoles.map((path) => `  ${path}`),
];
if (deprecatedByFile.size) {
  out.push('', 'Deprecated names by file');
  top(deprecatedByFile, 10).forEach(([file, uses]) =>
    out.push(`  ${file.padEnd(70)} ${uses}`),
  );
}
if (hardcodedByFile.size) {
  out.push('', 'Files with the most hard-coded values');
  top(hardcodedByFile, 8).forEach(([file, uses]) =>
    out.push(`  ${file.padEnd(70)} ${uses}`),
  );
  out.push(
    '',
    process.env.DETAILS
      ? ['Every hard-coded value', ...details].join('\n')
      : 'Run with DETAILS=1 to list every hard-coded value by line.',
  );
}
process.stdout.write(`${out.join('\n')}\n`);
