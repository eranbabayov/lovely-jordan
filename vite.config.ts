import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * `HTTPS=1` enables a self-signed certificate for the dev server.
 *
 * Needed to test on a phone: over plain http the LAN origin is not a secure
 * context, so `crypto.subtle` is undefined and both the gate and gift
 * decryption fail. `localhost` is exempt, which is why desktop works without
 * this — the phone is not.
 */
const useHttps = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    // Listen on the LAN so a phone on the same Wi-Fi can reach it.
    host: true,
  },
  build: {
    outDir: 'dist',
    // The whole point is a plain static bundle that drops onto any host.
    assetsDir: 'assets',
  },
});
