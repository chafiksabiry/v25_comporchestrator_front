/**
 * Dynamically set the public path for the microfrontend when running inside Qiankun.
 * This ensures that assets (images, styles, etc.) are correctly referenced from the
 * microfrontend's base URL instead of the orchestrator's URL.
 */

// Extend the global `Window` interface to include qiankun-specific properties
export {};

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

// Declare the Webpack `__webpack_public_path__` variable for compatibility
// with libraries that might expect it, even if using Vite.
declare let __webpack_public_path__: string;

if (window.__POWERED_BY_QIANKUN__) {
  if (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__) {
    // @ts-ignore
    __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  } else {
    console.warn(
      '[Qiankun] __INJECTED_PUBLIC_PATH_BY_QIANKUN__ is not defined!'
    );
  }
}
