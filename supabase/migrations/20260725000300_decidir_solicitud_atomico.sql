-- =============================================================================
-- Decidir una solicitud en una sola transacción
-- =============================================================================
-- La Edge Function hacía tres escrituras sueltas: la solicitud, el perfil y la
-- auditoría. Si la segunda fallaba —y falló— la solicitud quedaba decidida
-- mientras el perfil seguía como postulante: la persona ni entra ni consta como
-- rechazada, y la solicitud ya no aparece en la bandeja para reintentarlo.
--
-- Aquí las tres van juntas. La función es la frontera de la decisión; la Edge
-- Function conserva lo que no puede hacer la base de datos: comprobar quién
-- llama y enviar el correo.
-- =============================================================================

create or replace function public.decidir_solicitud(
  p_solicitud_id uuid,
  p_decision     text,
  p_actor        uuid,
  p_motivo       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_admision;
  v_postulante public.perfiles;
begin
  if p_decision not in ('aprobado', 'rechazado') then
    raise exception 'Decisión inválida: %', p_decision using errcode = '22023';
  end if;

  -- `for update` para que dos admins decidiendo a la vez no se pisen.
  select * into v_solicitud
  from public.solicitudes_admision
  where id = p_solicitud_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;

  if v_solicitud.estatus <> 'pendiente' then
    raise exception 'Esta solicitud ya fue decidida.' using errcode = '23505';
  end if;

  update public.solicitudes_admision
     set estatus         = p_decision::estatus_solicitud,
         aprobado_por    = p_actor,
         decidido_at     = now(),
         motivo_decision = p_motivo
   where id = p_solicitud_id;

  update public.perfiles
     set estatus = case when p_decision = 'aprobado' then 'activo' else 'rechazado' end::estatus_perfil
   where id = v_solicitud.usuario_id
  returning * into v_postulante;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (
    p_actor,
    case when p_decision = 'aprobado' then 'solicitud_aprobada' else 'solicitud_rechazada' end,
    'solicitudes_admision',
    p_solicitud_id,
    jsonb_build_object('motivo', p_motivo)
  );

  return jsonb_build_object(
    'nombre_usuario', v_postulante.nombre_usuario,
    'correo', v_postulante.correo
  );
end;
$$;

-- Solo el servidor. Un cliente con sesión de admin no puede saltarse la
-- comprobación de rol que hace la Edge Function antes de llamar aquí.
revoke execute on function public.decidir_solicitud(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.decidir_solicitud(uuid, text, uuid, text) to service_role;
