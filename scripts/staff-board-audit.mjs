import { readFile } from 'node:fs/promises';
const violations=[];
const source=async(path)=>{try{return await readFile(new URL(`../${path}`,import.meta.url),'utf8');}catch{violations.push(`${path}: archivo requerido no encontrado.`);return '';}};
const [entry,page,contract,main]=await Promise.all([source('src/pages/ProfesoresMultirama.tsx'),source('src/pages/ProfesoresStaffBoard.tsx'),source('src/staff-board-v2.css'),source('src/main.tsx')]);
if(entry&&!entry.includes('ProfesoresStaffBoard'))violations.push('ProfesoresMultirama: debe delegar al Staff Board.');
if(page){
  if(!page.includes('Staff Board · Equipo técnico'))violations.push('ProfesoresStaffBoard: falta firma Staff Board.');
  for(const endpoint of ["api.get('/api/profesores')","api.get('/api/profesores/actividad')","api.post('/api/profesores'","api.put(`/api/profesores/${editing.id}`","/estado","/reset-password"])if(!page.includes(endpoint))violations.push(`ProfesoresStaffBoard: falta contrato ${endpoint}.`);
  if(!page.includes('occupiedByOthers'))violations.push('ProfesoresStaffBoard: debe preservar exclusividad de categoría.');
  if(!page.includes('DirectorProfessorCasesPanel'))violations.push('ProfesoresStaffBoard: no perder seguimiento de casos del equipo.');
  if(page.includes('DirectorStat')||page.includes('DirectorHero')||page.includes('DirectorPanel'))violations.push('ProfesoresStaffBoard: no volver a composición SaaS genérica.');
}
if(contract){for(const selector of ['.staff-board-roster','.staff-board-row','.staff-board-coverage','.staff-board-activity','.staff-board-dialog'])if(!contract.includes(selector))violations.push(`staff-board-v2.css: falta contrato ${selector}.`);}
if(main&&!main.includes("import './staff-board-v2.css';"))violations.push('main.tsx: Staff Board V2 debe seguir cargado.');
if(violations.length){console.error('\nStaff Board audit FAILED\n');for(const violation of violations)console.error(`- ${violation}`);process.exit(1);}console.log('Staff Board audit OK · cobertura, asignaciones, acceso, actividad y credenciales protegidos.');
