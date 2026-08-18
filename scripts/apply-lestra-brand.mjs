import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const SEARCH_ROOTS = ['src'];
const SINGLE_FILES = ['index.html'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.md']);
const replacements = [
  [/SYNCademia/g, 'LESTRA'],
  [/Syncademia/g, 'Lestra'],
];

let changedFiles = 0;
let changedOccurrences = 0;

async function transformFile(filePath) {
  if (!TEXT_EXTENSIONS.has(extname(filePath))) return;
  const original = await readFile(filePath, 'utf8');
  let next = original;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, (...args) => {
      changedOccurrences += 1;
      return replacement;
    });
  }
  if (next === original) return;
  await writeFile(filePath, next, 'utf8');
  changedFiles += 1;
  console.log(`Actualizado: ${filePath}`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else await transformFile(fullPath);
  }
}

for (const root of SEARCH_ROOTS) await walk(join(ROOT, root));
for (const file of SINGLE_FILES) await transformFile(join(ROOT, file));

console.log(`Rebranding aplicado: ${changedOccurrences} reemplazo(s) en ${changedFiles} archivo(s).`);
