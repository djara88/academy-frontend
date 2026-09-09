import { readFile } from 'node:fs/promises';

const violations = [];
const read = async (path) => {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
};

const entry = await read('src/pages/ApoderadoPortalEnhanced.tsx');
const home = await read('src/pages/GuardianHomePortal.tsx');
const contract = await read('src/guardian-home-v2.css');
const main = await read('src/main.tsx');

if (!entry.includes("./GuardianHomePortal")) violations.push('ApoderadoPortalEnhanced.tsx: /apoderado debe usar GuardianHomePortal.');
for (const signature of ['Lo importante de tus deportistas', 'Mi familia deportiva', 'Próximos eventos', 'Tus derechos sobre los datos']) {
  if (!home.includes(signature)) violations.push(`GuardianHomePortal.tsx: falta firma ${signature}.`);
}
for (const api of ["'/api/apoderados/me'", "'/api/apoderados/me/solicitudes-privacidad'"]) {
  if (!home.includes(api)) violations.push(`GuardianHomePortal.tsx: falta contrato ${api}.`);
}
for (const component of ['GuardianFinanceStatement', 'GuardianSportsResponses', 'GuardianSportsRequests']) {
  if (!home.includes(`<${component}`)) violations.push(`GuardianHomePortal.tsx: debe conservar ${component}.`);
}
if (!home.includes("to=\"/apoderado/mensajes\"")) violations.push('GuardianHomePortal.tsx: debe conservar acceso a mensajes.');
if (/#[0-9a-fA-F]{3,8}\b/.test(home)) violations.push('GuardianHomePortal.tsx: no introducir colores hex directos.');
if (!contract.includes('Family Home V2') || !contract.includes('.guardian-now')) violations.push('guardian-home-v2.css: falta contrato Product DNA familiar.');
if (!main.includes("import './guardian-home-v2.css';")) violations.push('main.tsx: debe cargar guardian-home-v2.css.');

if (violations.length) {
  console.error('Guardian Home audit FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log('Guardian Home audit OK');
