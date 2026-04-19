/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_QIANKUN: string;
    readonly VITE_API_URL_CALL: string;
    readonly VITE_HIDE_SECTIONS: string;
    readonly VITE_API_URL_GIGS: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
