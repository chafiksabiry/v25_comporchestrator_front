/// <reference types="vite/client" />

interface ImportMetaEnv {
    [x: string]: any;
    readonly VITE_API_URL: string;
    readonly VITE_QIANKUN: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }