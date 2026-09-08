import { readdir, readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const srcDir = new URL('../src/', import.meta.url);

const legacyRepairStylesAllowlist = new Set([
  'src/mobile-dock-v2-1-fix.css',
]);

const forbiddenRepairName = /(?:-fix|-polish|-contrast-lock|-safety)\.css$/i;
const violations = [];

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) files.push(...await walk(next));
    else files.push(next);
  }
  return files;
}

async function requiredSource(path) {
  try {
    return await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  } catch {
    violations.push(`${path}: archivo crítico no encontrado.`);
    return '';
  }
}

const files = await walk(srcDir);

for (const fileUrl of files) {
  const absolute = fileUrl.pathname;
  const path = relative(root.pathname, absolute).replaceAll('\\', '/');
  if (extname(path) === '.css' && forbiddenRepairName.test(path) && !legacyRepairStylesAllowlist.has(path)) {
    violations.push(`${path}: no agregar nuevas capas CSS correctivas. Corregir el componente o contrato propietario.`);
  }
}

for (const requiredPath of ['AGENTS.md', 'docs/PRODUCT-DNA-DEPORTIVO.md']) {
  try {
    const text = await readFile(new URL(`../${requiredPath}`, import.meta.url), 'utf8');
    if (!text.trim()) violations.push(`${requiredPath}: archivo requerido vacío.`);
  } catch {
    violations.push(`${requiredPath}: contrato Product DNA requerido no encontrado.`);
  }
}

const mainEntry = await requiredSource('src/main.tsx');

const directorLayout = await requiredSource('src/layouts/Layout.tsx');
const directorNavigation = await requiredSource('src/components/navigation/DirectorCommandBar.tsx');
if (directorLayout) {
  if (!directorLayout.includes('DirectorCommandBar')) violations.push('src/layouts/Layout.tsx: Director debe usar DirectorCommandBar en vez de volver al sidebar SaaS genérico.');
  if (directorLayout.includes('directorGroups')) violations.push('src/layouts/Layout.tsx: no reintroducir la navegación lateral legacy del Director.');
}
if (directorNavigation) {
  for (const zone of ['Jornada', 'Plantel', 'Competir', 'Operación', 'Academia']) {
    if (!directorNavigation.includes(`label: '${zone}'`)) violations.push(`src/components/navigation/DirectorCommandBar.tsx: falta la zona de trabajo ${zone}.`);
  }
  if (!directorNavigation.includes('<dialog')) violations.push('src/components/navigation/DirectorCommandBar.tsx: navegación móvil expandida debe conservar un diálogo/bottom sheet accesible.');
  if (!directorNavigation.includes('Mapa de trabajo')) violations.push('src/components/navigation/DirectorCommandBar.tsx: falta el mapa contextual de navegación móvil.');
}

const directorHome = await requiredSource('src/pages/Dashboard.tsx');
if (directorHome) {
  if (directorHome.includes('MetricCard')) violations.push('src/pages/Dashboard.tsx: Inicio Director no puede volver al patrón MetricCard.');
  if (directorHome.includes('QuickAction')) violations.push('src/pages/Dashboard.tsx: Inicio Director no puede volver a mosaicos QuickAction genéricos.');
  if (!directorHome.includes('Match Command')) violations.push('src/pages/Dashboard.tsx: falta la firma deportiva Match Command en la zona dominante.');
  if (!directorHome.includes('Season Timeline')) violations.push('src/pages/Dashboard.tsx: falta la firma deportiva Season Timeline.');
  if (!directorHome.includes('Pulso operativo')) violations.push('src/pages/Dashboard.tsx: falta contexto de plantel orientado a operación.');
  if (!directorHome.includes('var(--ls-surface)') || !directorHome.includes('var(--ls-ink)')) violations.push('src/pages/Dashboard.tsx: la superficie migrada debe usar tokens semánticos Lestra.');
  if (/#[0-9a-fA-F]{3,8}\b/.test(directorHome)) violations.push('src/pages/Dashboard.tsx: no introducir colores hexadecimales directos en la superficie Product DNA migrada.');
}

const studentsPage = await requiredSource('src/pages/Alumnos.tsx');
const rosterStrip = await requiredSource('src/components/roster/RosterStrip.tsx');
if (studentsPage) {
  if (!studentsPage.includes('<RosterStrip')) violations.push('src/pages/Alumnos.tsx: Plantel debe conservar la firma de dominio RosterStrip.');
  if (!studentsPage.includes('categoryFilter') || !studentsPage.includes('disciplineFilter')) violations.push('src/pages/Alumnos.tsx: el roster debe poder leerse dentro de disciplina y categoría.');
  if (!studentsPage.includes('Plantel · vista operativa')) violations.push('src/pages/Alumnos.tsx: falta el contexto operativo del plantel.');
}
if (rosterStrip) {
  if (!rosterStrip.includes('Roster Strip')) violations.push('src/components/roster/RosterStrip.tsx: falta la firma textual Roster Strip.');
  if (!rosterStrip.includes('Contexto deportivo')) violations.push('src/components/roster/RosterStrip.tsx: cada fila debe mostrar contexto deportivo, no solo identidad personal.');
  if (/#[0-9a-fA-F]{3,8}\b/.test(rosterStrip)) violations.push('src/components/roster/RosterStrip.tsx: el componente de dominio debe usar tokens semánticos, no hexadecimales directos.');
}

const performanceCanvas = await requiredSource('src/performance-canvas-v2.css');
if (performanceCanvas) {
  if (!performanceCanvas.includes('Performance Canvas V2')) violations.push('src/performance-canvas-v2.css: falta identidad Performance Canvas.');
  if (!performanceCanvas.includes('--pc-dark') || !performanceCanvas.includes('--pc-sage')) violations.push('src/performance-canvas-v2.css: Performance Canvas debe conservar tokens locales de materialidad.');
}
if (mainEntry && !mainEntry.includes("import './performance-canvas-v2.css';")) violations.push('src/main.tsx: Performance Canvas V2 debe cargarse desde la entrada principal.');

const professorPortal = await requiredSource('src/pages/ProfesorPortal.tsx');
const attendanceLineup = await requiredSource('src/components/profesor/AttendanceLineup.tsx');
const trainingSessionContract = await requiredSource('src/training-session-v2.css');
if (professorPortal) {
  if (!professorPortal.includes('<AttendanceLineup')) violations.push('src/pages/ProfesorPortal.tsx: Asistencia de Profesor debe conservar AttendanceLineup.');
  if (!professorPortal.includes("rosterState === 'verified'")) violations.push('src/pages/ProfesorPortal.tsx: el lineup no puede habilitarse sin lista verificada.');
  if (!professorPortal.includes('draftKey') || !professorPortal.includes('writeAttendanceDraft')) violations.push('src/pages/ProfesorPortal.tsx: asistencia debe conservar borrador local aislado por contexto.');
}
if (attendanceLineup) {
  for (const signature of ['Training Session', 'Attendance Lineup']) {
    if (!attendanceLineup.includes(signature)) violations.push(`src/components/profesor/AttendanceLineup.tsx: falta firma ${signature}.`);
  }
  if (!attendanceLineup.includes('aria-pressed')) violations.push('src/components/profesor/AttendanceLineup.tsx: estados de asistencia deben exponerse semánticamente con aria-pressed.');
  if (/#[0-9a-fA-F]{3,8}\b/.test(attendanceLineup)) violations.push('src/components/profesor/AttendanceLineup.tsx: componente de dominio no debe usar hexadecimales directos.');
}
if (trainingSessionContract && !trainingSessionContract.includes('.attendance-lineup')) violations.push('src/training-session-v2.css: falta contrato visual de AttendanceLineup.');
if (mainEntry && !mainEntry.includes("import './training-session-v2.css';")) violations.push('src/main.tsx: Training Session V2 debe cargarse desde la entrada principal.');

const matchWorkspace = await requiredSource('src/pages/EventosRendimientoEnhanced.tsx');
const matchCommandContract = await requiredSource('src/match-command-v2.css');
if (matchWorkspace && !matchWorkspace.includes('Match Command · Competencia')) violations.push('src/pages/EventosRendimientoEnhanced.tsx: falta la firma Match Command.');
if (matchCommandContract && !matchCommandContract.includes('fixture board')) violations.push('src/match-command-v2.css: el contrato debe conservar la arquitectura de fixture board.');
if (mainEntry && !mainEntry.includes("import './match-command-v2.css';")) violations.push('src/main.tsx: Match Command V2 debe cargarse desde la entrada principal.');

const finance = await requiredSource('src/pages/FinanzasMultirama.tsx');
const financeDesk = await requiredSource('src/components/FinanceSchoolDashboard.tsx');
const financeDeskContract = await requiredSource('src/finance-desk-v2.css');
if (finance) {
  if (!finance.includes('baseVerified')) violations.push('src/pages/FinanzasMultirama.tsx: Finanzas debe distinguir lectura verificada de estado desconocido.');
  if (!finance.includes('Estado financiero no verificado')) violations.push('src/pages/FinanzasMultirama.tsx: falta estado explícito de finanzas no verificadas.');
  if (!finance.includes('idempotency_key')) violations.push('src/pages/FinanzasMultirama.tsx: movimientos manuales deben conservar clave idempotente durante reintentos.');
  if (/summary\?\.totalIngresosReales\s*\|\|\s*0/.test(finance)) violations.push('src/pages/FinanzasMultirama.tsx: estado financiero desconocido no puede convertirse en $0.');
}
if (financeDesk) {
  if (!financeDesk.includes('Academy Finance Desk') || !financeDesk.includes('Caja y cobranza de hoy')) violations.push('src/components/FinanceSchoolDashboard.tsx: falta la firma Academy Finance Desk.');
  if (financeDesk.includes('DirectorPanel')) violations.push('src/components/FinanceSchoolDashboard.tsx: la superficie principal no debe volver a depender de paneles genéricos DirectorPanel.');
}
if (financeDeskContract && !financeDeskContract.includes('.academy-finance-desk')) violations.push('src/finance-desk-v2.css: falta contrato visual Academy Finance Desk.');
if (mainEntry && !mainEntry.includes("import './finance-desk-v2.css';")) violations.push('src/main.tsx: Academy Finance Desk V2 debe cargarse desde la entrada principal.');

const communicationsHub = await requiredSource('src/pages/CommunicationsHub.tsx');
const familyTouchpoint = await requiredSource('src/pages/ChatCenterOmnichannel.tsx');
const familyTouchpointContract = await requiredSource('src/family-touchpoint-v2.css');
if (communicationsHub) {
  if (!communicationsHub.includes('Family Touchpoint · Comunicación')) violations.push('src/pages/CommunicationsHub.tsx: falta la firma Family Touchpoint.');
  if (!communicationsHub.includes('Grupos de categoría')) violations.push('src/pages/CommunicationsHub.tsx: la coordinación grupal debe conservar contexto de categoría.');
}
if (familyTouchpoint) {
  if (!familyTouchpoint.includes('family-touchpoint-command')) violations.push('src/pages/ChatCenterOmnichannel.tsx: falta la superficie Family Touchpoint.');
  if (!familyTouchpoint.includes('Deportista y familia')) violations.push('src/pages/ChatCenterOmnichannel.tsx: conversación debe mantener visible contexto deportista/familia.');
  if (familyTouchpoint.includes('DirectorStat')) violations.push('src/pages/ChatCenterOmnichannel.tsx: comunicación no puede volver al resumen de StatCards genéricas.');
  if (!familyTouchpoint.includes("origin_channel === 'whatsapp'")) violations.push('src/pages/ChatCenterOmnichannel.tsx: no perder trazabilidad del canal WhatsApp.');
}
if (familyTouchpointContract && !familyTouchpointContract.includes('.family-touchpoint-workspace')) violations.push('src/family-touchpoint-v2.css: falta contrato visual Family Touchpoint.');
if (mainEntry && !mainEntry.includes("import './family-touchpoint-v2.css';")) violations.push('src/main.tsx: Family Touchpoint V2 debe cargarse desde la entrada principal.');

const enrollmentHandoff = await requiredSource('src/pages/MatriculaPreparacion.tsx');
const enrollmentHandoffContract = await requiredSource('src/enrollment-handoff-v2.css');
if (enrollmentHandoff) {
  if (!enrollmentHandoff.includes('Matrícula Handoff')) violations.push('src/pages/MatriculaPreparacion.tsx: falta la firma Matrícula Handoff.');
  if (!enrollmentHandoff.includes('enrollment-handoff-progress')) violations.push('src/pages/MatriculaPreparacion.tsx: el flujo debe conservar su carril de preparación y firma.');
  if (!enrollmentHandoff.includes('JerseyNumberPicker')) violations.push('src/pages/MatriculaPreparacion.tsx: matrícula debe conservar reserva visual de dorsal.');
  if (!enrollmentHandoff.includes("api.post('/api/prematriculas'")) violations.push('src/pages/MatriculaPreparacion.tsx: no alterar el contrato de creación de pre-matrícula.');
  if (enrollmentHandoff.includes('DirectorStat')) violations.push('src/pages/MatriculaPreparacion.tsx: valores de matrícula no deben volver a StatCards genéricas.');
}
if (enrollmentHandoffContract && !enrollmentHandoffContract.includes('.enrollment-handoff-workbench')) violations.push('src/enrollment-handoff-v2.css: falta contrato visual Matrícula Handoff.');
if (mainEntry && !mainEntry.includes("import './enrollment-handoff-v2.css';")) violations.push('src/main.tsx: Matrícula Handoff V2 debe cargarse desde la entrada principal.');

const competitionRecord = await requiredSource('src/pages/TorneosMultirama.tsx');
const competitionRecordContract = await requiredSource('src/competition-record-v2.css');
if (competitionRecord) {
  if (!competitionRecord.includes('Competition Record')) violations.push('src/pages/TorneosMultirama.tsx: falta la firma Competition Record.');
  if (!competitionRecord.includes('competition-record-ledger')) violations.push('src/pages/TorneosMultirama.tsx: competencias deben conservar el ledger de temporada.');
  if (!competitionRecord.includes('/participantes')) violations.push('src/pages/TorneosMultirama.tsx: el registro debe conservar lectura de participación del torneo.');
  if (!competitionRecord.includes('/archivar')) violations.push('src/pages/TorneosMultirama.tsx: no perder el contrato de archivo histórico.');
  if (competitionRecord.includes('DirectorStat')) violations.push('src/pages/TorneosMultirama.tsx: competencias no pueden volver a StatCards genéricas.');
}
if (competitionRecordContract && !competitionRecordContract.includes('.competition-record-row')) violations.push('src/competition-record-v2.css: falta contrato visual Competition Record.');
if (mainEntry && !mainEntry.includes("import './competition-record-v2.css';")) violations.push('src/main.tsx: Competition Record V2 debe cargarse desde la entrada principal.');

// Advanced analytics is an Evolution Board: changes, season context and athlete
// progression must dominate instead of generic KPI cards.
const evolutionBoard = await requiredSource('src/pages/RendimientoAnalytics.tsx');
const evolutionBoardContract = await requiredSource('src/evolution-board-v2.css');
if (evolutionBoard) {
  if (!evolutionBoard.includes('Evolution Board · Alto Rendimiento')) violations.push('src/pages/RendimientoAnalytics.tsx: falta la firma Evolution Board.');
  if (!evolutionBoard.includes('Season Timeline')) violations.push('src/pages/RendimientoAnalytics.tsx: la analítica debe conservar lectura temporal de temporada.');
  if (!evolutionBoard.includes('/api/rendimiento/analitica')) violations.push('src/pages/RendimientoAnalytics.tsx: no alterar el contrato de analítica deportiva.');
  if (evolutionBoard.includes('DirectorStat')) violations.push('src/pages/RendimientoAnalytics.tsx: analítica no puede volver al resumen de StatCards genéricas.');
}
if (evolutionBoardContract && !evolutionBoardContract.includes('.evolution-board-discipline')) violations.push('src/evolution-board-v2.css: falta contrato visual Evolution Board.');
if (mainEntry && !mainEntry.includes("import './evolution-board-v2.css';")) violations.push('src/main.tsx: Evolution Board V2 debe cargarse desde la entrada principal.');

const liveMatch = await requiredSource('src/components/profesor/LiveMatchPanel.tsx');
if (liveMatch) {
  if (!liveMatch.includes('expected_live_updated_at')) violations.push('src/components/profesor/LiveMatchPanel.tsx: escrituras en vivo deben transportar versión de concurrencia.');
  if (!liveMatch.includes('LIVE_STATE_CONFLICT')) violations.push('src/components/profesor/LiveMatchPanel.tsx: falta tratamiento explícito de conflicto concurrente.');
  if (!liveMatch.includes('/en-vivo-v2/estadisticas/')) violations.push('src/components/profesor/LiveMatchPanel.tsx: estadísticas en vivo no pueden volver a la ruta legacy sin versión.');
}

if (violations.length) {
  console.error('\nProduct DNA audit FAILED\n');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nNo se permite aumentar deuda visual ni degradar la integridad operacional para resolver una pantalla.\n');
  process.exit(1);
}

console.log(`Product DNA audit OK · ${files.length} archivos revisados · contratos visuales y operacionales críticos preservados.`);
