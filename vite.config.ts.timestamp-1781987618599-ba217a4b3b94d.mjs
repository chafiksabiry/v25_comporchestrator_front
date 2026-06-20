// vite.config.ts
import { defineConfig } from "file:///D:/HARX2026/microfrontends/v25_comporchestrator_front/node_modules/vite/dist/node/index.js";
import react from "file:///D:/HARX2026/microfrontends/v25_comporchestrator_front/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import qiankun from "file:///D:/HARX2026/microfrontends/v25_comporchestrator_front/node_modules/vite-plugin-qiankun/dist/index.js";
import * as cheerio from "file:///D:/HARX2026/microfrontends/v25_comporchestrator_front/node_modules/cheerio/dist/esm/index.js";
var __vite_injected_original_dirname = "D:\\HARX2026\\microfrontends\\v25_comporchestrator_front";
var removeReactRefreshScript = () => {
  return {
    name: "remove-react-refresh",
    transformIndexHtml(html) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      return $.html();
    }
  };
};
var vite_config_default = defineConfig(() => {
  return {
    base: "https://harxv25comporchestratorfront.netlify.app/",
    plugins: [
      react({
        jsxRuntime: "classic"
      }),
      qiankun("company", {
        useDevMode: true
      }),
      removeReactRefreshScript()
    ],
    server: {
      port: 5183,
      strictPort: true,
      cors: true,
      hmr: false,
      watch: {
        ignored: ["**/node_modules/**", "**/dist/**"]
      },
      fs: {
        strict: true
      }
    },
    build: {
      target: "esnext",
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: "es",
          entryFileNames: "index.js",
          chunkFileNames: "chunk-[name].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "index.css";
            }
            return "[name].[ext]";
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxIQVJYMjAyNlxcXFxtaWNyb2Zyb250ZW5kc1xcXFx2MjVfY29tcG9yY2hlc3RyYXRvcl9mcm9udFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcSEFSWDIwMjZcXFxcbWljcm9mcm9udGVuZHNcXFxcdjI1X2NvbXBvcmNoZXN0cmF0b3JfZnJvbnRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0hBUlgyMDI2L21pY3JvZnJvbnRlbmRzL3YyNV9jb21wb3JjaGVzdHJhdG9yX2Zyb250L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgcWlhbmt1biBmcm9tICd2aXRlLXBsdWdpbi1xaWFua3VuJztcclxuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcclxuXHJcbi8vIFBsdWdpbiB0byByZW1vdmUgUmVhY3QgUmVmcmVzaCBwcmVhbWJsZVxyXG5jb25zdCByZW1vdmVSZWFjdFJlZnJlc2hTY3JpcHQgPSAoKSA9PiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdyZW1vdmUtcmVhY3QtcmVmcmVzaCcsXHJcbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbDogYW55KSB7XHJcbiAgICAgIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoaHRtbCk7XHJcbiAgICAgICQoJ3NjcmlwdFtzcmM9XCIvQHJlYWN0LXJlZnJlc2hcIl0nKS5yZW1vdmUoKTtcclxuICAgICAgcmV0dXJuICQuaHRtbCgpO1xyXG4gICAgfSxcclxuICB9O1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCgpID0+IHtcclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogJ2h0dHBzOi8vaGFyeHYyNWNvbXBvcmNoZXN0cmF0b3Jmcm9udC5uZXRsaWZ5LmFwcC8nLFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCh7XHJcbiAgICAgICAganN4UnVudGltZTogJ2NsYXNzaWMnLFxyXG4gICAgICB9KSxcclxuICAgICAgcWlhbmt1bignY29tcGFueScsIHtcclxuICAgICAgICB1c2VEZXZNb2RlOiB0cnVlLFxyXG4gICAgICB9KSxcclxuICAgICAgcmVtb3ZlUmVhY3RSZWZyZXNoU2NyaXB0KCksXHJcbiAgICBdLFxyXG5cclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiA1MTgzLFxyXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gICAgICBjb3JzOiB0cnVlLFxyXG4gICAgICBobXI6IGZhbHNlLFxyXG4gICAgICB3YXRjaDoge1xyXG4gICAgICAgIGlnbm9yZWQ6IFsnKiovbm9kZV9tb2R1bGVzLyoqJywgJyoqL2Rpc3QvKionXVxyXG4gICAgICB9LFxyXG4gICAgICBmczoge1xyXG4gICAgICAgIHN0cmljdDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxyXG4gICAgICBjc3NDb2RlU3BsaXQ6IGZhbHNlLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBmb3JtYXQ6ICdlcycsXHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2luZGV4LmpzJyxcclxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnY2h1bmstW25hbWVdLmpzJyxcclxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZT8uZW5kc1dpdGgoJy5jc3MnKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnaW5kZXguY3NzJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gJ1tuYW1lXS5bZXh0XSc7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5VixTQUFTLG9CQUFvQjtBQUN0WCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sYUFBYTtBQUNwQixZQUFZLGFBQWE7QUFKekIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTSwyQkFBMkIsTUFBTTtBQUNyQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixtQkFBbUIsTUFBVztBQUM1QixZQUFNLElBQVksYUFBSyxJQUFJO0FBQzNCLFFBQUUsK0JBQStCLEVBQUUsT0FBTztBQUMxQyxhQUFPLEVBQUUsS0FBSztBQUFBLElBQ2hCO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhLE1BQU07QUFDaEMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLFFBQ0osWUFBWTtBQUFBLE1BQ2QsQ0FBQztBQUFBLE1BQ0QsUUFBUSxXQUFXO0FBQUEsUUFDakIsWUFBWTtBQUFBLE1BQ2QsQ0FBQztBQUFBLE1BQ0QseUJBQXlCO0FBQUEsSUFDM0I7QUFBQSxJQUVBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxNQUNMLE9BQU87QUFBQSxRQUNMLFNBQVMsQ0FBQyxzQkFBc0IsWUFBWTtBQUFBLE1BQzlDO0FBQUEsTUFDQSxJQUFJO0FBQUEsUUFDRixRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGNBQWM7QUFBQSxNQUNkLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQixDQUFDLGNBQWM7QUFDN0IsZ0JBQUksVUFBVSxNQUFNLFNBQVMsTUFBTSxHQUFHO0FBQ3BDLHFCQUFPO0FBQUEsWUFDVDtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
