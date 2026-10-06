import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const globalRoute = config.routes?.find((route) => route.src === '/(.*)' && route.headers);
const headers = globalRoute?.headers || {};
const csp = headers['Content-Security-Policy'];

if (!csp) throw new Error('CSP audit failed: enforced Content-Security-Policy header is missing.');
if (headers['Content-Security-Policy-Report-Only']) {
  throw new Error('CSP audit failed: Report-Only policy must not be used as the production security boundary.');
}

const directive = (name) => {
  const match = csp.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name} `) || item === name);
  return match || '';
};

const scriptSrc = directive('script-src');
if (!scriptSrc.includes("'self'")) throw new Error('CSP audit failed: script-src must allow only application scripts.');
if (scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-eval'") || scriptSrc.includes('https:')) {
  throw new Error('CSP audit failed: script-src contains an unsafe broad source.');
}

const connectSrc = directive('connect-src');
for (const required of [
  "'self'",
  'https://academy-backend-kqsv.onrender.com',
  'https://yihcktculicmuuzzxzik.supabase.co',
  'wss://yihcktculicmuuzzxzik.supabase.co',
]) {
  if (!connectSrc.includes(required)) throw new Error(`CSP audit failed: connect-src missing ${required}`);
}
if (/\shttps:(?:\s|$)/.test(connectSrc) || /\swss:(?:\s|$)/.test(connectSrc)) {
  throw new Error('CSP audit failed: connect-src must not permit arbitrary HTTPS/WSS origins.');
}

const styleSrc = directive('style-src');
if (/\shttps:(?:\s|$)/.test(styleSrc)) throw new Error('CSP audit failed: style-src must not allow arbitrary HTTPS origins.');
if (!styleSrc.includes('https://fonts.googleapis.com')) throw new Error('CSP audit failed: Google Fonts stylesheet origin is missing.');

for (const expected of ["object-src 'none'", "frame-ancestors 'none'", "frame-src 'none'", "form-action 'self'"]) {
  if (!csp.includes(expected)) throw new Error(`CSP audit failed: missing ${expected}`);
}

console.log('CSP security audit passed.');
