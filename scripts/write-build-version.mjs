import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const readGitSha = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const buildId = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || readGitSha()
  || 'dev';

await mkdir('public', { recursive: true });
await writeFile(
  'public/build-version.json',
  `${JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8',
);

console.log(`Build version: ${buildId.slice(0, 12)}`);
