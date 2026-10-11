/**
 * Dev server with HTTPS, for testing on a real phone.
 *
 *   npm run dev:phone
 *
 * Why this exists: over plain `http://192.168.x.x` the origin is not a secure
 * context, so `crypto.subtle` is undefined — the gate reports an HTTPS error
 * and no gift can be decrypted. `localhost` is exempt from that rule, which is
 * why plain `npm run dev` is fine on this machine but useless on a phone.
 *
 * The certificate is self-signed, so the phone will warn once. That is
 * expected; tap through it.
 *
 * A plain env-var prefix (`HTTPS=1 vite`) is not portable to PowerShell, hence
 * a launcher rather than an inline script.
 */

import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

console.log('\n  Open on your phone (same Wi-Fi), accepting the certificate warning:\n');
for (const address of addresses) {
  console.log(`    https://${address}:5173/`);
}
console.log('');

const child = spawn('npx', ['vite', '--host'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, HTTPS: '1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
