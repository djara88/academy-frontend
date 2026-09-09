import { readFile } from 'node:fs/promises';

const violations = [];

async function source(path) {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
}

const uniformsEntry = await source('src/pages/UniformesMultirama.tsx');
const kitRoom = await source('src/pages/UniformesKitRoom.tsx');
const jerseys = await source('src/pages/JerseyNumbers.tsx');
const contract = await source('src/kit-room-v2.css');
const main = await source('src/main.tsx');

if (!uniformsEntry.includes("./UniformesKitRoom")) violations.push('UniformesMultirama.tsx: /uniformes debe seguir entrando por Kit Room.');

for (const signature of ['Kit Room · Equipamiento', 'Locker Board', 'Equipamiento del plantel']) {
  if (!kitRoom.includes(signature)) violations.push(`UniformesKitRoom.tsx: falta firma ${signature}.`);
}
for (const api of ["'/api/uniformes'", "'/api/uniformes/catalogo'", "'/api/uniformes/pedidos'"]) {
  if (!kitRoom.includes(api)) violations.push(`UniformesKitRoom.tsx: falta contrato API ${api}.`);
}
for (const operation of ['/actualizar', 'generar_cobro', 'resumenTaller', 'XLSX.writeFile']) {
  if (!kitRoom.includes(operation)) violations.push(`UniformesKitRoom.tsx: no perder operación ${operation}.`);
}
if (!kitRoom.includes("loadState === 'verified'") && !kitRoom.includes("loadState === \"verified\"")) violations.push('UniformesKitRoom.tsx: mutaciones deben depender de un estado verificado.');
if (/#[0-9a-fA-F]{3,8}\b/.test(kitRoom)) violations.push('UniformesKitRoom.tsx: la superficie migrada no debe introducir colores hex directos.');

for (const signature of ['Locker Board · Dorsales', 'Números del plantel', 'JerseyNumberPicker']) {
  if (!jerseys.includes(signature)) violations.push(`JerseyNumbers.tsx: falta firma/función ${signature}.`);
}
if (!jerseys.includes("'/api/uniformes/dorsales/asignar'")) violations.push('JerseyNumbers.tsx: no perder asignación de dorsal en servidor.');

if (!contract.includes('Lestra Deportivo — Kit Room / Locker Board V2')) violations.push('kit-room-v2.css: falta identidad del contrato visual.');
if (!contract.includes('.kit-room-command') || !contract.includes('.jersey-locker')) violations.push('kit-room-v2.css: faltan superficies principales de Kit Room y Locker Board.');
if (!main.includes("import './kit-room-v2.css';")) violations.push('main.tsx: debe cargar kit-room-v2.css.');

if (violations.length) {
  console.error('Kit Room audit FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Kit Room audit OK');
