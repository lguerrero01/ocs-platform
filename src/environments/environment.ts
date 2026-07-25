/**
 * Configuración de entorno.
 *
 * La `anonKey` de Supabase es pública por diseño: toda la autorización real vive
 * en las políticas RLS de PostgreSQL (ver `supabase/migrations/`). Nunca coloques
 * aquí la `service_role key` — esa solo va en Edge Functions del lado del servidor.
 *
 * Copia `environment.example.ts` a `environment.local.ts` si prefieres mantener
 * tus credenciales fuera del control de versiones.
 */
export const environment = {
  production: false,
  supabaseUrl: 'https://pquonfituwunglzypsjv.supabase.co',
  supabaseAnonKey: 'sb_publishable_SGm2y_Jv5yegOMh9qxmbUg_iV9w4s-0',

  /** URL a la que apuntan los QR de reclutamiento y el enlace de los correos. */
  appUrl: 'http://localhost:4200',

  /**
   * Geolocalización. La organización puede exigir compartir ubicación para
   * operar, pero el usuario siempre ve por qué, con qué frecuencia y puede
   * revocarla. Ver `GeoConsentService`.
   */
  geo: {
    /** Si es true, el usuario debe aceptar el consentimiento antes de entrar. */
    required: true,
    /** Cada cuánto se refresca la posición, en minutos. 0 = solo al iniciar sesión. */
    refreshMinutes: 0,
  },
};
