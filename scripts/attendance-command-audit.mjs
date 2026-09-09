import { readFile } from 'node:fs/promises';

const violations=[];
const source=async(path)=>{try{return await readFile(new URL(`../${path}`,import.meta.url),'utf8');}catch{violations.push(`${path}: archivo requerido no encontrado.`);return '';}};
const [entry,page,contract,main]=await Promise.all([source('src/pages/AsistenciasMultirama.tsx'),source('src/pages/AsistenciasDirectorCommand.tsx'),source('src/attendance-command-v2.css'),source('src/main.tsx')]);

if(entry&&!entry.includes("AsistenciasDirectorCommand"))violations.push('AsistenciasMultirama: la ruta debe delegar al Attendance Command.');
if(page){
  if(!page.includes('Training Session Record · Director'))violations.push('AsistenciasDirectorCommand: falta firma Training Session Record.');
  if(!page.includes("type RosterState='idle'|'loading'|'verified'|'error'"))violations.push('AsistenciasDirectorCommand: falta estado explícito de verificación de roster.');
  if(!page.includes("rosterState==='verified'"))violations.push('AsistenciasDirectorCommand: el roster debe distinguir dato verificado.');
  if(!page.includes('aria-pressed={current===value}'))violations.push('AsistenciasDirectorCommand: asistencia individual debe exponer aria-pressed.');
  for(const endpoint of ["api.post('/api/entrenamientos'","/reagendar-notificar","/reporte-mensual","/api/entrenamientos/alumnos","/api/entrenamientos/metricas"])if(!page.includes(endpoint))violations.push(`AsistenciasDirectorCommand: falta contrato operacional ${endpoint}.`);
  if(!page.includes('XLSX.writeFile'))violations.push('AsistenciasDirectorCommand: no perder exportación Excel.');
  if(page.includes('DirectorStat')||page.includes('DirectorHero')||page.includes('DirectorPanel'))violations.push('AsistenciasDirectorCommand: no volver a composición SaaS genérica.');
}
if(contract){for(const selector of ['.attendance-session-shell','.attendance-verified','.attendance-player-row','.attendance-state-group','.attendance-report-pulse'])if(!contract.includes(selector))violations.push(`attendance-command-v2.css: falta contrato ${selector}.`);}
if(main&&!main.includes("import './attendance-command-v2.css';"))violations.push('main.tsx: Attendance Command V2 debe seguir cargado.');

if(violations.length){console.error('\nAttendance Command audit FAILED\n');for(const violation of violations)console.error(`- ${violation}`);process.exit(1);}
console.log('Attendance Command audit OK · sesión, roster verificado, recuperación y reportes protegidos.');
