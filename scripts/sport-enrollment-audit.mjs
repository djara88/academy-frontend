import { readFile } from 'node:fs/promises';

const violations = [];
const read = async (path) => {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
};

const entry = await read('src/pages/InscripcionesDeportivasEnhanced.tsx');
const board = await read('src/pages/SportEnrollmentBoard.tsx');
const contract = await read('src/sport-enrollment-v2.css');
const main = await read('src/main.tsx');

if (!entry.includes("./SportEnrollmentBoard")) violations.push('InscripcionesDeportivasEnhanced.tsx: /inscripciones debe usar SportEnrollmentBoard.');
for (const signature of ['Plantel · Inscripciones', 'Agregar una disciplina al deportista', 'Impacto financiero']) {
  if (!board.includes(signature)) violations.push(`SportEnrollmentBoard.tsx: falta firma ${signature}.`);
}
for (const api of ["'/api/inscripciones/alumnos'", "'/api/estructura'", "'/api/jugadores/categorias'", "'/api/inscripciones'"]) {
  if (!board.includes(api)) violations.push(`SportEnrollmentBoard.tsx: falta contrato ${api}.`);
}
if (!board.includes('activeBranchIds.has')) violations.push('SportEnrollmentBoard.tsx: debe impedir duplicar una inscripción activa en la misma rama.');
if (!board.includes('dataVerified')) violations.push('SportEnrollmentBoard.tsx: no permitir mutaciones sobre datos no verificados.');
if (/#[0-9a-fA-F]{3,8}\b/.test(board)) violations.push('SportEnrollmentBoard.tsx: no introducir colores hex directos.');
if (!contract.includes('Sport Enrollment Board V2') || !contract.includes('.sport-enrollment-flow')) violations.push('sport-enrollment-v2.css: falta contrato Product DNA.');
if (!main.includes("import './sport-enrollment-v2.css';")) violations.push('main.tsx: debe cargar sport-enrollment-v2.css.');

if (violations.length) {
  console.error('Sport Enrollment audit FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log('Sport Enrollment audit OK');
