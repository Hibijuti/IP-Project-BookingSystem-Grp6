import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        packages: resolve(rootDir, 'packages.html'),
        videos: resolve(rootDir, 'videos.html'),
        booking: resolve(rootDir, 'booking.html'),
        admin: resolve(rootDir, 'admin.html'),
      },
    },
  },
});
