// This file is used to configure the public path for the application
// It's particularly important for single-spa applications

if (window.__POWERED_BY_QIANKUN__) {
  // Running inside Qiankun micro-frontend framework
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  
  // Configure single-spa to prevent bootstrap timeout issues
  if (window.singleSpa) {
    window.singleSpa.setBootstrapMaxTime(10000); // 10 seconds
    window.singleSpa.setMountMaxTime(10000); // 10 seconds
    window.singleSpa.setUnmountMaxTime(10000); // 10 seconds
    window.singleSpa.setUnloadMaxTime(10000); // 10 seconds
  }
  
  console.log('🚀 [app11] Running inside Qiankun');
  console.log('🚀 [app11] Public path configured:', __webpack_public_path__);
} else {
  // Running as standalone application
  console.log('🚀 [app11] Running as standalone application');
}

// Export for use in other files
export {};
