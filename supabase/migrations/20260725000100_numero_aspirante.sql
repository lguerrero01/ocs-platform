-- =============================================================================
-- Número de aspirante
-- =============================================================================
-- El aspirante recibe un número en el momento en que un admin emite su código,
-- no cuando crea la cuenta: la pantalla de bienvenida tiene que saludarlo por
-- ese número antes de que exista un usuario en el sistema.
-- =============================================================================

create sequence if not exists public.numero_aspirante_seq start 1;

alter table public.codigos_qr
  add column if not exists numero_aspirante bigint not null
    default nextval('public.numero_aspirante_seq');

-- Si se borra la columna, la secuencia se va con ella.
alter sequence public.numero_aspirante_seq owned by public.codigos_qr.numero_aspirante;

comment on column public.codigos_qr.numero_aspirante is
  'Correlativo que identifica al aspirante desde que se emite su código hasta que se decide su solicitud.';

-- ---------------------------------------------------------------------------
-- canjear_codigo_qr: ahora devuelve también el número de aspirante, para que
-- la pantalla de advertencia pueda mostrarlo sin una consulta extra (la tabla
-- `codigos_qr` no es legible por un postulante todavía sin sesión).
-- ---------------------------------------------------------------------------
create or replace function public.canjear_codigo_qr(p_codigo uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo public.codigos_qr;
begin
  select * into v_codigo
  from public.codigos_qr
  where codigo_aleatorio = p_codigo
  for update;

  if not found then
    return jsonb_build_object('valido', false, 'motivo', 'inexistente');
  end if;

  if v_codigo.usado then
    return jsonb_build_object('valido', false, 'motivo', 'usado');
  end if;

  if v_codigo.inhabilitado_at is not null then
    return jsonb_build_object('valido', false, 'motivo', 'inhabilitado');
  end if;

  if v_codigo.expira_at < now() then
    return jsonb_build_object('valido', false, 'motivo', 'expirado');
  end if;

  update public.codigos_qr
     set usado = true,
         usado_por = auth.uid(),
         inhabilitado_at = now()
   where id = v_codigo.id;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id)
  values (auth.uid(), 'qr_canjeado', 'codigos_qr', v_codigo.id);

  return jsonb_build_object(
    'valido', true,
    'codigo_id', v_codigo.id,
    'numero_aspirante', v_codigo.numero_aspirante
  );
end;
$$;

grant execute on function public.canjear_codigo_qr(uuid) to anon, authenticated;
