import { readFile } from 'node:fs/promises';

const violations = [];
const source = async (path) => {
  try { return await readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }
  catch { violations.push(`${path}: archivo requerido no encontrado.`); return ''; }
};

const [entry, familyBoard, licenseEntry, licenseBoard, contract, main, app] = await Promise.all([
  source('src/pages/Apoderados.tsx'),
  source('src/pages/ApoderadosFamilyBoard.tsx'),
  source('src/pages/ApoderadosProV2.tsx'),
  source('src/pages/GuardianLicenseBoard.tsx'),
  source('src/family-access-v2.css'),
  source('src/main.tsx'),
  source('src/App.tsx'),
]);

if (entry && !entry.includes('ApoderadosFamilyBoard')) violations.push('Apoderados: debe delegar al Family Access Board.');
if (licenseEntry && !licenseEntry.includes('GuardianLicenseBoard')) violations.push('Apoderados PRO: debe delegar al Guardian License Board.');

if (familyBoard) {
  if (!familyBoard.includes('Family Access Board')) violations.push('Family Access Board: falta firma de producto.');
  for (const contractItem of [
    "api.get('/api/apoderados')",
    "api.patch(`/api/apoderados/${editing.id}`",
    "api.post(`/api/apoderados/${selected.id}/acceso`",
    "api.patch(`/api/apoderados/${guardian.id}/estado`",
    "api.post(`/api/apoderados/${guardian.id}/reset-password`",
    '/comunicaciones',
    'guardian.jugadores',
    "aria-pressed={filter===value}",
  ]) if (!familyBoard.includes(contractItem)) violations.push(`Family Access Board: falta contrato ${contractItem}.`);
  if (familyBoard.includes('DirectorStat') || familyBoard.includes('DirectorHero') || familyBoard.includes('DirectorPanel')) violations.push('Family Access Board: no volver a composición SaaS genérica.');
}

if (licenseBoard) {
  if (!licenseBoard.includes('Family Access · Licencia de academia')) violations.push('Guardian License Board: falta lenguaje de licencia familiar.');
  for (const contractItem of [
    "/api/subscriptions/plans",
    "/api/mercadopago/status",
    "/api/mercadopago/platform-subscription/guardian-addon",
    'billing_cycle',
    'confirmación por webhook',
  ]) if (!licenseBoard.includes(contractItem)) violations.push(`Guardian License Board: falta contrato ${contractItem}.`);
}

if (contract) {
  for (const selector of [
    '.family-access-command',
    '.family-access-row',
    '.family-access-athletes',
    '.family-access-status',
    '.family-access-dialog',
    '.guardian-license-command',
    '.guardian-license-workspace',
    '.guardian-license-option',
  ]) if (!contract.includes(selector)) violations.push(`family-access-v2.css: falta contrato ${selector}.`);
}

if (main && !main.includes("import './family-access-v2.css';")) violations.push('main.tsx: Family Access V2 debe seguir cargado.');
if (app) {
  if (!app.includes('path="/apoderados"')) violations.push('App: falta ruta /apoderados.');
  if (!app.includes('path="/apoderados-pro"')) violations.push('App: falta ruta /apoderados-pro.');
}

if (violations.length) {
  console.error('\nFamily Access audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Family Access audit OK · vínculo familia-deportistas, acceso, licencia y checkout verificable protegidos.');
