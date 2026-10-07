import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/contexts/AuthContext.tsx',
  'src/layouts/Layout.tsx',
  'src/config/superadmin.ts',
  'src/pages/Login.tsx',
];

const sources = files.map((file) => ({
  file,
  source: fs.readFileSync(path.join(root, file), 'utf8'),
}));

const forbidden = [
  /MASTER_ADMIN_EMAIL/,
  /user\?\.email\s*===/,
  /email\?\.toLowerCase\(\)\s*===/,
  /storedUser\.email\s*===/,
  /d\.jarazerene@gmail\.com/i,
];

for (const { file, source } of sources) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      throw new Error(`Superadmin security audit failed in ${file}: forbidden email-based authorization pattern ${pattern}`);
    }
  }
}

const config = sources.find((item) => item.file === 'src/config/superadmin.ts')?.source || '';
if (!config.includes('VITE_SUPERADMIN_USER_ID')) {
  throw new Error('Superadmin security audit failed: VITE_SUPERADMIN_USER_ID is not configured in the identity helper.');
}

console.log('Superadmin frontend security audit passed.');
