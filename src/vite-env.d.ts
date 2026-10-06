/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BUILD_ID: string;
  readonly VITE_SUPERADMIN_USER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
