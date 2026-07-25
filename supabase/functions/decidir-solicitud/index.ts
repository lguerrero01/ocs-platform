// Edge Function: aprueba o rechaza una solicitud de admisión y envía el correo
// con la plantilla editable de `config_correo`.
//
// Se ejecuta con la service_role key (solo del lado servidor), pero valida
// primero que quien llama sea admin — nunca confíes en el cliente.
//
// Desplegar:  supabase functions deploy decidir-solicitud
// Secretos:   supabase secrets set RESEND_API_KEY=... CORREO_REMITENTE=...

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const CORREO_REMITENTE = Deno.env.get('CORREO_REMITENTE') ?? 'no-reply@example.com';
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:4200';

/**
 * `apikey` y `x-client-info` las añade supabase-js por su cuenta en cada
 * invocación. Si no se declaran aquí, el preflight las rechaza y la llamada
 * nunca sale del navegador — la función responde perfectamente desde curl y aun
 * así la aplicación no puede usarla.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function render(plantilla: string, vars: Record<string, string>): string {
  return plantilla.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { solicitud_id, decision, motivo } = await req.json();

    if (!solicitud_id || !['aprobado', 'rechazado'].includes(decision)) {
      return json({ error: 'Parámetros inválidos.' }, 400);
    }

    // 1. Identificar a quien llama a partir de su JWT.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: 'No autenticado.' }, 401);

    // 2. Confirmar que es admin. Esta es la comprobación que importa.
    const { data: actor } = await admin
      .from('perfiles')
      .select('id, rol')
      .eq('id', userData.user.id)
      .single();

    if (!actor || !['admin', 'super_admin'].includes(actor.rol)) {
      return json({ error: 'No autorizado.' }, 403);
    }

    // 3. Aplicar la decisión. Solicitud, perfil y auditoría van dentro de una
    //    sola transacción en la base de datos: por separado, un fallo a mitad
    //    dejaba la solicitud decidida y a la persona en el limbo, sin entrar y
    //    sin constar como rechazada.
    const { data: postulante, error: errorDecision } = await admin.rpc('decidir_solicitud', {
      p_solicitud_id: solicitud_id,
      p_decision: decision,
      p_actor: actor.id,
      p_motivo: motivo ?? null,
    });

    if (errorDecision) {
      const mensaje = errorDecision.message ?? 'No se pudo aplicar la decisión.';
      const estado = mensaje.includes('ya fue decidida')
        ? 409
        : mensaje.includes('no encontrada')
          ? 404
          : 500;
      return json({ error: mensaje }, estado);
    }

    // 4. Correo con la plantilla editable por el super admin.
    const { data: plantilla } = await admin
      .from('config_correo')
      .select('plantilla_asunto, plantilla_cuerpo')
      .eq('clave', decision === 'aprobado' ? 'aprobacion' : 'rechazo')
      .single();

    let correoEnviado = false;
    if (plantilla && RESEND_API_KEY) {
      const vars = {
        nombre_usuario: postulante.nombre_usuario,
        enlace: `${APP_URL}/auth/login`,
        motivo: motivo ?? '',
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: CORREO_REMITENTE,
          to: postulante.correo,
          subject: render(plantilla.plantilla_asunto, vars),
          html: render(plantilla.plantilla_cuerpo, vars),
        }),
      });
      correoEnviado = res.ok;
    }

    return json({ ok: true, decision, correo_enviado: correoEnviado });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
