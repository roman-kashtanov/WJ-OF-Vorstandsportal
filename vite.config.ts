import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {readFileSync} from 'fs';

// Einzige Quelle der Versionsnummer: package.json. Damit kann die Anzeige in
// der App nicht mehr von der tatsaechlich ausgelieferten Fassung abweichen -
// "npm version <patch|minor|major>" genuegt.
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
