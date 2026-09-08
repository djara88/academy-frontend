import { readdir, readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

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

async function requiredSource(path) {
  try {
    return await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  } catch {
    violations.push(`${path}: archivo crítico no encontrado.`);
    return '';
  }
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

// Integrity contracts for high-risk production surfaces. These are intentionally
// narrow: they prevent regressions into the exact classes of failures already
// observed without pretending to replace real end-to-end QA.
const finance = await requiredSource('src/pages/FinanzasMultirama.tsx');
if (finance) {
  if (!finance.includes('baseVerified')) violations.push('src/pages/FinanzasMultirama.tsx: Finanzas debe distinguir lectura verificada de estado desconocido.');
  if (!finance.includes('Estado financiero no verificado')) violations.push('src/pages/FinanzasMultirama.tsx: falta estado explícito de finanzas no verificadas.');
  if (!finance.includes('idempotency_key')) violations.push('src/pages/FinanzasMultirama.tsx: movimientos manuales deben conservar clave idempotente durante reintentos.');
  if (/summary\?\.totalIngresosReales\s*\|\|\s*0/.test(finance)) violations.push('src/pages/FinanzasMultirama.tsx: estado financiero desconocido no puede convertirse en $0.');
}

const liveMatch = await requiredSource('src/components/profesor/LiveMatchPanel.tsx');
if (liveMatch) {
  if (!liveMatch.includes('expected_live_updated_at')) violations.push('src/components/profesor/LiveMatchPanel.tsx: escrituras en vivo deben transportar versión de concurrencia.');
  if (!liveMatch.includes('LIVE_STATE_CONFLICT')) violations.push('src/components/profesor/LiveMatchPanel.tsx: falta tratamiento explícito de conflicto concurrente.');
  if (!liveMatch.includes('/en-vivo-v2/estadisticas/')) violations.push('src/components/profesor/LiveMatchPanel.tsx: estadísticas en vivo no pueden volver a la ruta legacy sin versión.');
}

if (violations.length) {
  console.error('\nProduct DNA audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nNo se permite aumentar deuda visual ni degradar la integridad operacional para resolver una pantalla.\n');
  process.exit(1);
}

console.log(`Product DNA audit OK · ${files.length} archivos revisados · contratos visuales y operacionales críticos preservados.`);
