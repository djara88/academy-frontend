import fs from 'node:fs';
import path from 'node:path';

const baseline = {
  'src/operational-workflows-v2.css': [309, 14, 34],
  'src/competition-record-v2.css': [3, 5, 0],
  'src/kit-room-v2.css': [0, 2, 0],
  'src/setup-v2.css': [183, 0, 29],
  'src/family-touchpoint-v2.css': [15, 0, 0],
  'src/availability-board-v2.css': [0, 3, 0],
  'src/enrollment-handoff-v2.css': [0, 2, 0],
  'src/student-profile-v2.css': [138, 33, 27],
  'src/attendance-command-v2.css': [0, 3, 0],
  'src/visual-system-v2.css': [91, 4, 34],
  'src/public-academy-v2.css': [0, 9, 0],
  'src/family-access-v2.css': [3, 0, 0],
  'src/staff-board-v2.css': [3, 0, 0],
  'src/performance-canvas-v2.css': [73, 12, 10],
  'src/finance-desk-v2.css': [25, 4, 0],
  'src/sports-dialogs-v2.css': [0, 1, 30],
  'src/training-session-v2.css': [3, 2, 0],
  'src/guardian-home-v2.css': [6, 0, 0],
  'src/match-command-v2.css': [86, 4, 2],
  'src/product-design-v2-1.css': [87, 7, 12],
  'src/subscription-v2.css': [84, 0, 49],
  'src/portal-visibility.css': [50, 0, 11],
  'src/index.css': [16, 5, 0],
  'src/visual-readability-final.css': [29, 0, 1],
  'src/director-brand-normalize.css': [12, 0, 0],
  'src/director-accent-cleanup.css': [4, 0, 0],
  'src/formation-friendlies.css': [1, 0, 0],
  'src/prematricula-hide-finalidades.css': [1, 0, 0],
};

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const cssFiles = walk('src').filter((file) => file.endsWith('.css')).map((file) => file.replaceAll('\\', '/'));
const regressions = [];
const improvements = [];

for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const counts = [
    (source.match(/!important/g) || []).length,
    (source.match(/:nth-(?:of-type|child)\(/g) || []).length,
    (source.match(/\[class[*^$]?=/g) || []).length,
  ];
  const allowed = baseline[file] || [0, 0, 0];

  counts.forEach((count, index) => {
    if (count > allowed[index]) regressions.push(`${file} metric[${index}] ${count} > baseline ${allowed[index]}`);
  });

  if (counts.some((count, index) => count < allowed[index])) {
    improvements.push({ file, counts, baseline: allowed });
  }
}

if (regressions.length) {
  throw new Error(`CSS debt regression detected:\n${regressions.join('\n')}`);
}

for (const file of ['src/mobile-dock-v2-1-fix.css', 'src/readability-contract.css', 'src/accessibility-contract-v3.css']) {
  const source = fs.readFileSync(file, 'utf8');
  if (/!important|:nth-(?:of-type|child)\(|\[class[*^$]?=/.test(source)) {
    throw new Error(`Semantic CSS contract regressed in ${file}.`);
  }
}

console.log(`CSS debt baseline protected. Improvements detected: ${improvements.length}.`);
