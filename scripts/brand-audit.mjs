import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const SEARCH_ROOTS = ['src'];
const SINGLE_FILES = ['index.html'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.md']);
const LEGACY_PATTERN = /syncademia/gi;

const findings = [];

async function inspectFile(filePath) {
  if (!TEXT_EXTENSIONS.has(extname(filePath))) return;
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (LEGACY_PATTERN.test(line)) {
      findings.push({
        file: relative(ROOT, filePath),
        line: index + 1,
        excerpt: line.trim().slice(0, 180),
      });
    }
    LEGACY_PATTERN.lastIndex = 0;
  });
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else await inspectFile(fullPath);
  }
}

for (const root of SEARCH_ROOTS) await walk(join(ROOT, root));
for (const file of SINGLE_FILES) await inspectFile(join(ROOT, file));

if (findings.length) {
  console.error('\nBrand audit failed: se encontraron referencias visibles o de código al nombre legado.\n');
  findings.forEach(({ file, line, excerpt }) => console.error(`- ${file}:${line}  ${excerpt}`));
  console.error(`\nTotal: ${findings.length} referencia(s).`);
  process.exit(1);
}

console.log('Brand audit OK: no quedan referencias al nombre legado en src/ ni index.html.');
