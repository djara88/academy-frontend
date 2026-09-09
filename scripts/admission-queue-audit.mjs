import { readFile } from 'node:fs/promises';

const violations = [];
const read = async (path) => {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
};

const entry = await read('src/pages/AdmissionRequests.tsx');
const queue = await read('src/pages/AdmissionQueue.tsx');
const contract = await read('src/admission-queue-v2.css');
const main = await read('src/main.tsx');

if (!entry.includes("./AdmissionQueue")) violations.push('AdmissionRequests.tsx: /solicitudes debe usar AdmissionQueue.');
for (const signature of ['Admission Queue · Admisión', 'Familias que quieren entrar a la academia', 'Próximo paso']) {
  if (!queue.includes(signature)) violations.push(`AdmissionQueue.tsx: falta firma ${signature}.`);
}
for (const api of ["'/api/solicitudes-admision'", "'/api/estructura'", '/prematricula']) {
  if (!queue.includes(api)) violations.push(`AdmissionQueue.tsx: falta contrato ${api}.`);
}
for (const state of ['nueva', 'contactada', 'en_revision', 'prematricula', 'archivada']) {
  if (!queue.includes(state)) violations.push(`AdmissionQueue.tsx: falta estado ${state}.`);
}
if (!queue.includes("loadState === 'verified'")) violations.push('AdmissionQueue.tsx: las decisiones deben depender de estado verificado.');
if (!queue.includes('navigator.clipboard.writeText')) violations.push('AdmissionQueue.tsx: debe conservar copia del enlace de pre-matrícula.');
if (/#[0-9a-fA-F]{3,8}\b/.test(queue)) violations.push('AdmissionQueue.tsx: no introducir colores hex directos.');
if (!contract.includes('Admission Queue V2') || !contract.includes('.admission-ledger')) violations.push('admission-queue-v2.css: falta contrato Product DNA.');
if (!main.includes("import './admission-queue-v2.css';")) violations.push('main.tsx: debe cargar admission-queue-v2.css.');

if (violations.length) {
  console.error('Admission Queue audit FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log('Admission Queue audit OK');
