import { defineConfig } from 'vite';
import { resolve } from 'path';

const rootDir = import.meta.dirname;

export default defineConfig({
  build: {
    emptyOutDir: false,
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
