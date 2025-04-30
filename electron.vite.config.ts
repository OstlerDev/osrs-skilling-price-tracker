import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['sqlite3', 'node-notifier']
      }
    },
    publicDir: 'src/assets',
    resolve: {
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    },
    resolve: {
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'dist/renderer'
    },
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
    }
  }
}); 