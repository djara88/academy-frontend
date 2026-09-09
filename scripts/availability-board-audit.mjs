import { readFile } from 'node:fs/promises';

const violations=[];
const source=async(path)=>{try{return await readFile(new URL(`../${path}`,import.meta.url),'utf8');}catch{violations.push(`${path}: archivo requerido no encontrado.`);return '';}};
const [page,contract,main]=await Promise.all([source('src/pages/SaludDisponibilidad.tsx'),source('src/availability-board-v2.css'),source('src/main.tsx')]);

if(page){
  if(!page.includes('Availability Board · Plantel'))violations.push('SaludDisponibilidad: falta firma Availability Board.');
  if(!page.includes('availability-board-roster'))violations.push('SaludDisponibilidad: falta lectura operacional de plantel.');
  if(!page.includes("api.get('/api/inscripciones/alumnos')"))violations.push('SaludDisponibilidad: falta contexto por rama/categoría.');
  if(!page.includes("api.get('/api/ficha-medica/resumen')"))violations.push('SaludDisponibilidad: no alterar resumen de disponibilidad.');
  if(!page.includes("api.put(`/api/ficha-medica/jugador/${selectedId}`"))violations.push('SaludDisponibilidad: no perder actualización de disponibilidad.');
  if(!page.includes('/lesiones'))violations.push('SaludDisponibilidad: no perder seguimiento de lesiones/retorno.');
  if(!page.includes('/certificados'))violations.push('SaludDisponibilidad: no perder certificados deportivos.');
  if(page.includes('DirectorHero')||page.includes('DirectorPanel'))violations.push('SaludDisponibilidad: no volver a composición genérica DirectorHero/DirectorPanel.');
}
if(contract){for(const selector of ['.availability-board-roster','.availability-board-detail','.availability-board-operational','.availability-board-sensitive-note'])if(!contract.includes(selector))violations.push(`availability-board-v2.css: falta contrato ${selector}.`);}
if(main&&!main.includes("import './availability-board-v2.css';"))violations.push('main.tsx: Availability Board V2 debe seguir cargado.');

if(violations.length){console.error('\nAvailability Board audit FAILED\n');for(const violation of violations)console.error(`- ${violation}`);process.exit(1);}
console.log('Availability Board audit OK · plantel, contexto, disponibilidad y datos sensibles protegidos.');
