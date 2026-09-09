import { readFile } from 'node:fs/promises';

const violations = [];

async function source(path) {
  try {
    return await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  } catch {
    violations.push(`${path}: archivo requerido no encontrado.`);
    return '';
  }
}

const [list, detail, intake, archive, contract, main] = await Promise.all([
  source('src/pages/TorneosMultirama.tsx'),
  source('src/pages/GestionarTorneoMultirama.tsx'),
  source('src/pages/NuevoTorneoMultirama.tsx'),
  source('src/pages/TorneosArchivados.tsx'),
  source('src/competition-record-v2.css'),
  source('src/main.tsx'),
]);

if (list) {
  if (!list.includes('Competition Record')) violations.push('TorneosMultirama: falta firma Competition Record.');
  if (!list.includes('competition-record-ledger')) violations.push('TorneosMultirama: falta ledger de temporada.');
  if (!list.includes('/participantes')) violations.push('TorneosMultirama: falta lectura de participación.');
  if (!list.includes('/archivar')) violations.push('TorneosMultirama: falta archivo histórico.');
  if (list.includes('DirectorStat')) violations.push('TorneosMultirama: no volver a StatCards genéricas.');
}

if (detail) {
  if (!detail.includes('Competition Control Room')) violations.push('GestionarTorneoMultirama: falta firma Competition Control Room.');
  if (!detail.includes('competition-control-workbench')) violations.push('GestionarTorneoMultirama: falta workbench operacional.');
  if (!detail.includes('/convocar')) violations.push('GestionarTorneoMultirama: no perder envío de convocatoria.');
  if (!detail.includes('/participantes')) violations.push('GestionarTorneoMultirama: no perder participantes de la competencia.');
  if (!detail.includes('Season Timeline')) violations.push('GestionarTorneoMultirama: falta lectura temporal de eventos.');
  if (detail.includes('DirectorStat')) violations.push('GestionarTorneoMultirama: no volver a StatCards genéricas.');
}

if (intake) {
  if (!intake.includes('Competition Intake')) violations.push('NuevoTorneoMultirama: falta firma Competition Intake.');
  if (!intake.includes('competition-intake-workbench')) violations.push('NuevoTorneoMultirama: falta workbench de registro.');
  if (!intake.includes("api.post('/api/torneos'")) violations.push('NuevoTorneoMultirama: no alterar creación de competencia.');
  if (!intake.includes("navigate(`/torneos/${response.data.data.id}`)")) violations.push('NuevoTorneoMultirama: debe abrir el control de la competencia creada.');
  if (intake.includes('DirectorStat')) violations.push('NuevoTorneoMultirama: no volver a stepper de StatCards.');
}

if (archive) {
  if (!archive.includes('Competition Archive')) violations.push('TorneosArchivados: falta firma Competition Archive.');
  if (!archive.includes('competition-record-ledger')) violations.push('TorneosArchivados: falta ledger histórico.');
  if (!archive.includes('/restaurar')) violations.push('TorneosArchivados: no perder restauración.');
  if (archive.includes('DirectorStat')) violations.push('TorneosArchivados: no volver a StatCards genéricas.');
}

if (contract) {
  for (const selector of ['.competition-record-row', '.competition-control-room', '.competition-control-workbench', '.competition-intake-workbench', '.competition-archive-ledger']) {
    if (!contract.includes(selector)) violations.push(`competition-record-v2.css: falta contrato ${selector}.`);
  }
}

if (main && !main.includes("import './competition-record-v2.css';")) violations.push('main.tsx: Competition Record V2 debe seguir cargado.');

if (violations.length) {
  console.error('\nCompetition cycle audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Competition cycle audit OK · listado, control room, intake y archivo protegidos.');
