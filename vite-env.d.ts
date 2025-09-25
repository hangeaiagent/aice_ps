/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_SERVER_GENERATION?: string
  readonly VITE_USE_BACKEND_PROXY?: string
  readonly VITE_DEEPSEEK_API_KEY?: string
  readonly VITE_NANOBANANA_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}