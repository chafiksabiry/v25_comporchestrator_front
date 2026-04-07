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
    base: process.env.NODE_ENV === 'production' 
      ? 'https://harxv25comporchestratorfront.netlify.app/' 
      : '/',
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
    },
    build: {
      target: 'esnext',
      minify: false, // Easier to debug for now
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // Use ESM for better compatibility with modern qiankun + vite
          format: 'es',
          // Remove fixed names to allow Vite's default behavior which is more robust
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
