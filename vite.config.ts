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
      removeReactRefreshScript(), // Add the script removal plugin
    ],

    server: {
      port: 5183,
      cors: true,
      hmr: false,
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**']
      },
      fs: {
        strict: true, // Ensure static assets are correctly resolved
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'umd',
          name: 'app11',
          entryFileNames: 'index.js', // Fixed name for the JS entry file
          chunkFileNames: 'chunk-[name].js', // Fixed name for chunks
          assetFileNames: (assetInfo: { name: string; }) => {
            // Ensure CSS files are consistently named
            if (assetInfo.name.endsWith('.css')) {
              return 'index.css';
            }
            return '[name].[ext]'; // Default for other asset types
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
