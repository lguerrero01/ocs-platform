-- =============================================================================
-- Permitir que el servidor decida admisiones
-- =============================================================================
-- `proteger_campos_privilegiados` deja pasar el cambio de rol, estatus, rango o
-- progreso solo si `es_admin()`, que se apoya en `auth.uid()`. La Edge Function
-- `decidir-solicitud` corre con la service_role key: ahí no hay usuario, así que
-- `auth.uid()` es null, `es_admin()` da falso y el trigger bloqueaba justo la
-- operación que debía permitir. Aprobar y rechazar fallaban con
-- «No puedes modificar rol, estatus, rango ni progreso».
--
-- La comprobación no puede hacerse con `current_user`: dentro de una función
-- SECURITY DEFINER ese valor es el del propietario, no el de quien llama. Se lee
-- el rol del JWT de la petición, que sí sobrevive al cambio de contexto.
-- =============================================================================

create or replace function public.es_servidor()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

comment on function public.es_servidor() is
  'Verdadero cuando la petición llega con la service_role key, es decir desde una Edge Function del lado servidor y nunca desde el navegador.';

create or replace function public.proteger_campos_privilegiados()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.es_servidor() or public.es_admin() then
    return new;
  end if;

  if new.rol is distinct from old.rol
     or new.estatus is distinct from old.estatus
     or new.rango_id is distinct from old.rango_id
     or new.progreso is distinct from old.progreso then
    raise exception 'No puedes modificar rol, estatus, rango ni progreso.';
  end if;

  return new;
end;
$$;

-- El de super_admin se deja como estaba: otorgar ese rol sigue exigiendo que lo
-- haga un super_admin desde su sesión. Ninguna función del servidor lo necesita.
