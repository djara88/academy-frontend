import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const entry = path.join(srcRoot, 'main.tsx');
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css'];

const normalize = (value) => path.normalize(value);

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (extensions.includes(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) result.push(normalize(full));
  }
  return result;
}

function resolveRelative(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base];
  for (const ext of extensions) candidates.push(`${base}${ext}`);
  for (const ext of extensions) candidates.push(path.join(base, `index${ext}`));
  return candidates.map(normalize).find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function importsOf(file) {
  const text = fs.readFileSync(file, 'utf8');
  const specs = new Set();
  const patterns = [
    /\bimport\s+(?:type\s+)?[\w*$,\s{}]+?\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) specs.add(match[1]);
  }
  return [...specs];
}

const allFiles = new Set(walk(srcRoot));
const reachable = new Set();
const unresolved = [];
const queue = [normalize(entry)];

while (queue.length) {
  const file = queue.pop();
  if (!file || reachable.has(file) || !fs.existsSync(file)) continue;
  reachable.add(file);
  for (const specifier of importsOf(file)) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveRelative(file, specifier);
    if (!resolved) {
      unresolved.push(`${path.relative(root, file)} -> ${specifier}`);
      continue;
    }
    if (!reachable.has(resolved)) queue.push(resolved);
  }
}

const orphans = [...allFiles]
  .filter((file) => !reachable.has(file))
  .map((file) => path.relative(root, file))
  .sort();

if (unresolved.length) {
  console.error('\nImportaciones relativas no resueltas:');
  unresolved.sort().forEach((item) => console.error(` - ${item}`));
}

if (orphans.length) {
  console.error(`\nArchivos fuente huérfanos (${orphans.length}):`);
  orphans.forEach((file) => console.error(` - ${file}`));
}

if (unresolved.length || orphans.length) process.exit(1);
console.log(`Orphan audit OK: ${reachable.size} archivos fuente alcanzables desde src/main.tsx.`);
