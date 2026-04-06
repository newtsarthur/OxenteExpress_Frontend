/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_PUBLIC_BOX_URL?: string;
  /** Cadastro público (OxenteExpress_Backend: POST /cadastro em public.js). */
  readonly VITE_REGISTER_PATH?: string;
  /** Se `vehicle`, usa POST `/vehicle` + userId no FormData; omitido = POST `/:userId/cadastro_veiculo` (private.js). */
  readonly VITE_VEHICLE_CREATE_PATH?: string;
  /** GET pacotes disponíveis ao entregador (default: /rider/packages). */
  readonly VITE_RIDER_PACKAGES_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
