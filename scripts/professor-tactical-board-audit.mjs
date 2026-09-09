import { readFile } from 'node:fs/promises';

const violations = [];
const source = async (path) => {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
};

const [portal, board, app] = await Promise.all([
  source('src/pages/ProfesorPortal.tsx'),
  source('src/components/profesor/ProfessorTacticalBoard.tsx'),
  source('src/App.tsx'),
]);

if (portal) {
  if (!portal.includes("type PortalTab = 'hoy' | 'asistencia' | 'entrenamientos' | 'partidos' | 'pizarra' | 'casos'")) violations.push('ProfesorPortal: la pizarra debe seguir siendo una función principal del profesor.');
  if (!portal.includes("activeTab === 'pizarra' ? <ProfessorTacticalBoard")) violations.push('ProfesorPortal: ProfessorTacticalBoard debe seguir montado en la pestaña Pizarra.');
}

if (board) {
  for (const contractItem of [
    "/api/profesores/me/pizarras",
    "/api/profesores/me/categorias/${categoryId}/asistencia",
    'smartArrange',
    'saveBoard',
    'deleteBoard',
    'exportPng',
    'undo',
    'redo',
    "tool === 'move'",
    "tool === 'draw'",
    "tool === 'arrow'",
    "tool === 'erase'",
    'FieldTemplate',
    'setPointerCapture',
  ]) if (!board.includes(contractItem)) violations.push(`ProfessorTacticalBoard: falta contrato ${contractItem}.`);
  for (const discipline of ['fút', 'basket', 'voley', 'tenis']) if (!board.includes(discipline)) violations.push(`ProfessorTacticalBoard: falta soporte de disciplina ${discipline}.`);
  if (!board.includes('Guardar pizarra')) violations.push('ProfessorTacticalBoard: falta acción explícita de guardado.');
  if (!board.includes('Exportar PNG')) violations.push('ProfessorTacticalBoard: falta exportación de la pizarra.');
}

if (app && !app.includes('path="/profesor"')) violations.push('App: falta ruta protegida /profesor.');

if (violations.length) {
  console.error('\nProfessor Tactical Board audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Professor Tactical Board audit OK · acceso, roster, dibujo, movimiento, persistencia, borrado y exportación protegidos.');
