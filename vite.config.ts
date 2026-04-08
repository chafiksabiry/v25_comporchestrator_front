import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import * as cheerio from 'cheerio';

// Plugin to remove React Refresh preamble
const removeReactRefreshScript = () => {
  return {
    name: 'remove-react-refresh',
    transformIndexHtml(html: any) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      return $.html();
    },
  };
};

export default defineConfig(() => {
  return {
    base: 'https://harxv25comporchestratorfront.netlify.app/',
    plugins: [
      react({
        jsxRuntime: 'classic',
      }),
      qiankun('app11', {
        useDevMode: true,
      }),
      removeReactRefreshScript(),
    ],

    server: {
      port: 5183,
      cors: true,
      hmr: false,
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**']
      },
      fs: {
        strict: true,
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: 'index.js',
          chunkFileNames: 'chunk-[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'index.css';
            }
            return '[name].[ext]';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
