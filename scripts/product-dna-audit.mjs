import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const srcDir = new URL('../src/', import.meta.url);

// Temporary legacy debt that already exists and must be removed through convergence.
// The audit prevents this pattern from growing while allowing the current production tree to build.
const legacyRepairStylesAllowlist = new Set([
  'src/mobile-dock-v2-1-fix.css',
]);

const forbiddenRepairName = /(?:-fix|-polish|-contrast-lock|-safety)\.css$/i;
const violations = [];

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) files.push(...await walk(next));
    else files.push(next);
  }
  return files;
}

const files = await walk(srcDir);

for (const fileUrl of files) {
  const absolute = fileUrl.pathname;
  const path = relative(root.pathname, absolute).replaceAll('\\', '/');

  if (extname(path) === '.css' && forbiddenRepairName.test(path) && !legacyRepairStylesAllowlist.has(path)) {
    violations.push(`${path}: no agregar nuevas capas CSS correctivas. Corregir el componente o contrato propietario.`);
  }
}

// Product DNA is a required repository contract, not optional documentation.
for (const requiredPath of ['AGENTS.md', 'docs/PRODUCT-DNA-DEPORTIVO.md']) {
  try {
    const text = await readFile(new URL(`../${requiredPath}`, import.meta.url), 'utf8');
    if (!text.trim()) violations.push(`${requiredPath}: archivo requerido vacío.`);
  } catch {
    violations.push(`${requiredPath}: contrato Product DNA requerido no encontrado.`);
  }
}

if (violations.length) {
  console.error('\nProduct DNA audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nNo se permite aumentar deuda visual para resolver una pantalla.\n');
  process.exit(1);
}

console.log(`Product DNA audit OK · ${files.length} archivos revisados · no se agregaron capas visuales correctivas nuevas.`);
