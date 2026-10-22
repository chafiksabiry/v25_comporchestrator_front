/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'mock' | 'live';
  readonly VITE_REGISTRATION_BACKEND_URL?: string;
  readonly VITE_API_BASE_URL?: string;
}
