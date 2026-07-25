-- =============================================================================
-- OCS Platform — esquema inicial
-- Plataforma de gestión de organizaciones cerradas y jerárquicas.
-- =============================================================================
-- Convención: todo lo que un cliente puede hacer está definido por RLS.
-- El frontend NUNCA es la frontera de seguridad; solo oculta lo que RLS ya niega.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
create type rol_usuario   as enum ('super_admin', 'admin', 'usuario');
create type estatus_perfil as enum ('postulante', 'activo', 'suspendido', 'rechazado');
create type estatus_solicitud as enum ('pendiente', 'aprobado', 'rechazado');
create type tipo_mision   as enum ('individual', 'grupal');
create type tipo_publicacion as enum ('noticia', 'articulo_lectura', 'anuncio', 'llamado_atencion');
create type estatus_pedido as enum ('pendiente', 'pagado', 'entregado', 'cancelado');

-- ---------------------------------------------------------------------------
-- rangos
-- Jerarquía autorreferenciada: `rango_subordinado_id` apunta al rango que está
-- inmediatamente bajo el mando de este.
-- ---------------------------------------------------------------------------
create table public.rangos (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null unique,
  nivel                 int  not null default 0,          -- mayor = más alto
  insignia_url          text,
  inventario_existencia int  not null default 0 check (inventario_existencia >= 0),
  responsabilidades     text,
  rango_subordinado_id  uuid references public.rangos (id) on delete set null,
  creado_at             timestamptz not null default now()
);

comment on column public.rangos.inventario_existencia is
  'Cuántos miembros pueden ostentar este rango simultáneamente (cupo).';

-- ---------------------------------------------------------------------------
-- perfiles
-- Extiende auth.users. El rol y el estatus SOLO los puede tocar un admin.
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  nombre_usuario text not null unique,
  correo         text not null,
  rango_id       uuid references public.rangos (id) on delete set null,
  rol            rol_usuario   not null default 'usuario',
  estatus        estatus_perfil not null default 'postulante',

  -- Ubicación: se guarda SOLO si el miembro dio consentimiento explícito.
  -- `geo_consentimiento_at` es la prueba de ese consentimiento; si es null,
  -- el trigger de más abajo impide escribir coordenadas.
  ubicacion_lat          double precision,
  ubicacion_lng          double precision,
  ubicacion_actualizada_at timestamptz,
  geo_consentimiento_at    timestamptz,

  progreso       int not null default 0 check (progreso between 0 and 100),
  creado_at      timestamptz not null default now()
);

comment on table public.perfiles is
  'Perfil de miembro. La ubicación requiere consentimiento explícito y revocable.';

-- ---------------------------------------------------------------------------
-- Helpers de autorización
-- SECURITY DEFINER + search_path fijo para que las políticas RLS puedan
-- consultar `perfiles` sin caer en recursión infinita.
-- ---------------------------------------------------------------------------
create or replace function public.mi_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select rol in ('admin', 'super_admin') from public.perfiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select rol = 'super_admin' from public.perfiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.es_miembro_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select estatus = 'activo' from public.perfiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.mi_rango_nivel()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.nivel from public.perfiles p
      join public.rangos r on r.id = p.rango_id
     where p.id = auth.uid()),
    0
  );
$$;

-- ---------------------------------------------------------------------------
-- codigos_qr — reclutamiento de un solo uso
-- ---------------------------------------------------------------------------
create table public.codigos_qr (
  id               uuid primary key default gen_random_uuid(),
  codigo_aleatorio uuid not null unique default gen_random_uuid(),
  creado_por       uuid not null references public.perfiles (id) on delete cascade,
  usado            boolean not null default false,
  usado_por        uuid references public.perfiles (id) on delete set null,
  inhabilitado_at  timestamptz,
  expira_at        timestamptz not null default (now() + interval '24 hours'),
  creado_at        timestamptz not null default now()
);

create index on public.codigos_qr (codigo_aleatorio) where not usado;

-- ---------------------------------------------------------------------------
-- solicitudes_admision
-- ---------------------------------------------------------------------------
create table public.solicitudes_admision (
  id                    uuid primary key default gen_random_uuid(),
  usuario_id            uuid not null unique references public.perfiles (id) on delete cascade,
  codigo_qr_id          uuid references public.codigos_qr (id) on delete set null,
  respuestas_formulario jsonb not null default '{}'::jsonb,
  estatus               estatus_solicitud not null default 'pendiente',

  -- Trazabilidad de quién decidió: exigido explícitamente por el spec.
  aprobado_por          uuid references public.perfiles (id) on delete set null,
  decidido_at           timestamptz,
  motivo_decision       text,

  fecha_solicitud       timestamptz not null default now()
);

create index on public.solicitudes_admision (estatus, fecha_solicitud desc);

-- ---------------------------------------------------------------------------
-- misiones y su progreso
-- ---------------------------------------------------------------------------
create table public.misiones (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  descripcion         text,
  tipo                tipo_mision not null default 'individual',
  rango_requerido_id  uuid references public.rangos (id) on delete set null,
  recompensa_creditos int not null default 0,
  activa              boolean not null default true,
  creado_por          uuid references public.perfiles (id) on delete set null,
  creado_at           timestamptz not null default now()
);

create table public.misiones_asignadas (
  id           uuid primary key default gen_random_uuid(),
  mision_id    uuid not null references public.misiones (id) on delete cascade,
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  completada   boolean not null default false,
  completada_at timestamptz,
  validada_por uuid references public.perfiles (id) on delete set null,
  unique (mision_id, usuario_id)
);

-- ---------------------------------------------------------------------------
-- penalizaciones — el otro lado de la barra de progreso
-- ---------------------------------------------------------------------------
create table public.penalizaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  motivo      text not null,
  puntos      int  not null,            -- negativo resta, positivo suma
  aplicada_por uuid references public.perfiles (id) on delete set null,
  creado_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- publicaciones — noticias, artículos, anuncios, llamados de atención
-- ---------------------------------------------------------------------------
create table public.publicaciones (
  id         uuid primary key default gen_random_uuid(),
  tipo       tipo_publicacion not null,
  titulo     text not null,
  contenido  text not null,
  publicado  boolean not null default true,
  creado_por uuid references public.perfiles (id) on delete set null,
  fecha      timestamptz not null default now()
);

create index on public.publicaciones (tipo, fecha desc);

-- ---------------------------------------------------------------------------
-- información institucional por rango
-- ---------------------------------------------------------------------------
create table public.info_institucional (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null,  -- mision_vision, valores, obligaciones, ...
  titulo         text not null,
  contenido      text not null,
  -- null = visible para todos los rangos; si no, nivel mínimo requerido.
  nivel_minimo   int not null default 0,
  orden          int not null default 0,
  unique (clave, nivel_minimo)
);

-- ---------------------------------------------------------------------------
-- tienda
-- ---------------------------------------------------------------------------
create table public.tienda_articulos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  descripcion      text,
  imagen_url       text,
  precio_usd       numeric(12, 2) not null check (precio_usd >= 0),
  precio_stablecoin numeric(18, 6),   -- se calcula desde config_moneda si es null
  stock            int not null default 0 check (stock >= 0),
  activo           boolean not null default true,
  creado_at        timestamptz not null default now()
);

create table public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  estatus     estatus_pedido not null default 'pendiente',
  total_usd   numeric(12, 2) not null default 0,
  creado_at   timestamptz not null default now()
);

create table public.pedido_items (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos (id) on delete cascade,
  articulo_id uuid not null references public.tienda_articulos (id) on delete restrict,
  cantidad    int not null check (cantidad > 0),
  precio_usd  numeric(12, 2) not null
);

-- ---------------------------------------------------------------------------
-- configuración editable por el super admin
-- ---------------------------------------------------------------------------
create table public.config_correo (
  id               uuid primary key default gen_random_uuid(),
  clave            text not null unique,  -- 'aprobacion' | 'rechazo'
  plantilla_asunto text not null,
  plantilla_cuerpo text not null,         -- HTML con {{nombre_usuario}}, {{enlace}}
  actualizado_por  uuid references public.perfiles (id) on delete set null,
  actualizado_at   timestamptz not null default now()
);

create table public.config_moneda (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null default 'Crédito',
  simbolo         text not null default 'CR',
  valor_usd       numeric(18, 6) not null default 1.0 check (valor_usd > 0),
  actualizado_por uuid references public.perfiles (id) on delete set null,
  actualizado_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- auditoría — quién hizo qué. Append-only: nadie puede borrar ni editar.
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id         bigserial primary key,
  actor_id   uuid references public.perfiles (id) on delete set null,
  accion     text not null,
  entidad    text,
  entidad_id uuid,
  detalle    jsonb not null default '{}'::jsonb,
  creado_at  timestamptz not null default now()
);

create index on public.auditoria (creado_at desc);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Al registrarse en auth.users se crea el perfil como 'postulante'.
create or replace function public.handle_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_usuario, correo, estatus, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_usuario', split_part(new.email, '@', 1)),
    new.email,
    'postulante',
    'usuario'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_nuevo_usuario();

-- Un usuario no puede auto-ascenderse: rol, estatus y rango solo los cambia un admin.
create or replace function public.proteger_campos_privilegiados()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.es_admin() then
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

create trigger trg_proteger_campos_privilegiados
  before update on public.perfiles
  for each row execute function public.proteger_campos_privilegiados();

-- Solo un super_admin puede crear o degradar otros super_admin.
create or replace function public.proteger_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rol = 'super_admin' or old.rol = 'super_admin')
     and new.rol is distinct from old.rol
     and not public.es_super_admin() then
    raise exception 'Solo un super admin puede otorgar o retirar el rol super_admin.';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_super_admin
  before update on public.perfiles
  for each row execute function public.proteger_super_admin();

-- Sin consentimiento registrado, no se guardan coordenadas. Punto.
create or replace function public.exigir_consentimiento_geo()
returns trigger
language plpgsql
as $$
begin
  if (new.ubicacion_lat is not null or new.ubicacion_lng is not null)
     and new.geo_consentimiento_at is null then
    raise exception 'No se puede almacenar ubicación sin consentimiento explícito.';
  end if;

  -- Revocar el consentimiento borra la última posición conocida.
  if new.geo_consentimiento_at is null and old.geo_consentimiento_at is not null then
    new.ubicacion_lat := null;
    new.ubicacion_lng := null;
    new.ubicacion_actualizada_at := null;
  end if;

  return new;
end;
$$;

create trigger trg_exigir_consentimiento_geo
  before insert or update on public.perfiles
  for each row execute function public.exigir_consentimiento_geo();

-- Canjear un código QR: valida y marca como usado en una sola operación atómica.
-- SECURITY DEFINER porque el postulante aún no tiene perfil cuando lo llama.
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

  return jsonb_build_object('valido', true, 'codigo_id', v_codigo.id);
end;
$$;

grant execute on function public.canjear_codigo_qr(uuid) to anon, authenticated;

-- Recalcula el progreso a partir de misiones completadas y penalizaciones.
create or replace function public.recalcular_progreso(p_usuario uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ganado int;
  v_penal  int;
  v_total  int;
begin
  select coalesce(sum(m.recompensa_creditos), 0) into v_ganado
    from public.misiones_asignadas ma
    join public.misiones m on m.id = ma.mision_id
   where ma.usuario_id = p_usuario and ma.completada;

  select coalesce(sum(puntos), 0) into v_penal
    from public.penalizaciones where usuario_id = p_usuario;

  v_total := greatest(0, least(100, v_ganado + v_penal));

  update public.perfiles set progreso = v_total where id = p_usuario;
  return v_total;
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.perfiles             enable row level security;
alter table public.rangos               enable row level security;
alter table public.codigos_qr           enable row level security;
alter table public.solicitudes_admision enable row level security;
alter table public.misiones             enable row level security;
alter table public.misiones_asignadas   enable row level security;
alter table public.penalizaciones       enable row level security;
alter table public.publicaciones        enable row level security;
alter table public.info_institucional   enable row level security;
alter table public.tienda_articulos     enable row level security;
alter table public.pedidos              enable row level security;
alter table public.pedido_items         enable row level security;
alter table public.config_correo        enable row level security;
alter table public.config_moneda        enable row level security;
alter table public.auditoria            enable row level security;

-- --- perfiles --------------------------------------------------------------
create policy "perfil propio visible"
  on public.perfiles for select
  using (id = auth.uid());

create policy "miembros activos ven a otros miembros activos"
  on public.perfiles for select
  using (public.es_miembro_activo() and estatus = 'activo');

create policy "admins ven todos los perfiles"
  on public.perfiles for select
  using (public.es_admin());

create policy "usuario edita su propio perfil"
  on public.perfiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins editan perfiles"
  on public.perfiles for update
  using (public.es_admin())
  with check (public.es_admin());

-- --- rangos ----------------------------------------------------------------
create policy "rangos visibles para autenticados"
  on public.rangos for select
  to authenticated using (true);

create policy "admins gestionan rangos"
  on public.rangos for all
  using (public.es_admin()) with check (public.es_admin());

-- --- codigos_qr ------------------------------------------------------------
-- Nadie los lee directamente desde el cliente: la validación pasa por
-- `canjear_codigo_qr()`. Los admins ven los que ellos generaron.
create policy "admins ven codigos"
  on public.codigos_qr for select
  using (public.es_admin());

create policy "admins generan codigos"
  on public.codigos_qr for insert
  with check (public.es_admin() and creado_por = auth.uid());

create policy "admins inhabilitan codigos"
  on public.codigos_qr for update
  using (public.es_admin()) with check (public.es_admin());

-- --- solicitudes_admision --------------------------------------------------
create policy "postulante ve su solicitud"
  on public.solicitudes_admision for select
  using (usuario_id = auth.uid());

create policy "postulante crea su solicitud"
  on public.solicitudes_admision for insert
  with check (usuario_id = auth.uid());

create policy "admins ven solicitudes"
  on public.solicitudes_admision for select
  using (public.es_admin());

create policy "admins deciden solicitudes"
  on public.solicitudes_admision for update
  using (public.es_admin()) with check (public.es_admin());

-- --- misiones --------------------------------------------------------------
create policy "miembros activos ven misiones de su nivel"
  on public.misiones for select
  using (
    public.es_miembro_activo()
    and activa
    and (
      rango_requerido_id is null
      or exists (
        select 1 from public.rangos r
         where r.id = misiones.rango_requerido_id
           and r.nivel <= public.mi_rango_nivel()
      )
    )
  );

create policy "admins gestionan misiones"
  on public.misiones for all
  using (public.es_admin()) with check (public.es_admin());

create policy "usuario ve sus asignaciones"
  on public.misiones_asignadas for select
  using (usuario_id = auth.uid() or public.es_admin());

create policy "usuario marca su mision"
  on public.misiones_asignadas for update
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "admins gestionan asignaciones"
  on public.misiones_asignadas for all
  using (public.es_admin()) with check (public.es_admin());

-- --- penalizaciones --------------------------------------------------------
create policy "usuario ve sus penalizaciones"
  on public.penalizaciones for select
  using (usuario_id = auth.uid() or public.es_admin());

create policy "admins aplican penalizaciones"
  on public.penalizaciones for insert
  with check (public.es_admin() and aplicada_por = auth.uid());

-- --- publicaciones ---------------------------------------------------------
create policy "miembros activos leen publicaciones"
  on public.publicaciones for select
  using (publicado and public.es_miembro_activo());

create policy "admins gestionan publicaciones"
  on public.publicaciones for all
  using (public.es_admin()) with check (public.es_admin());

-- --- info institucional ----------------------------------------------------
create policy "info segun rango"
  on public.info_institucional for select
  using (public.es_miembro_activo() and nivel_minimo <= public.mi_rango_nivel());

create policy "admins gestionan info"
  on public.info_institucional for all
  using (public.es_admin()) with check (public.es_admin());

-- --- tienda ----------------------------------------------------------------
create policy "miembros activos ven articulos"
  on public.tienda_articulos for select
  using (activo and public.es_miembro_activo());

create policy "admins gestionan articulos"
  on public.tienda_articulos for all
  using (public.es_admin()) with check (public.es_admin());

create policy "usuario ve sus pedidos"
  on public.pedidos for select
  using (usuario_id = auth.uid() or public.es_admin());

create policy "usuario crea pedidos"
  on public.pedidos for insert
  with check (usuario_id = auth.uid() and public.es_miembro_activo());

create policy "admins gestionan pedidos"
  on public.pedidos for update
  using (public.es_admin()) with check (public.es_admin());

create policy "items visibles con el pedido"
  on public.pedido_items for select
  using (exists (
    select 1 from public.pedidos p
     where p.id = pedido_items.pedido_id
       and (p.usuario_id = auth.uid() or public.es_admin())
  ));

create policy "usuario agrega items a su pedido"
  on public.pedido_items for insert
  with check (exists (
    select 1 from public.pedidos p
     where p.id = pedido_items.pedido_id and p.usuario_id = auth.uid()
  ));

-- --- configuración ---------------------------------------------------------
create policy "admins leen config correo"
  on public.config_correo for select using (public.es_admin());

create policy "super admin edita config correo"
  on public.config_correo for all
  using (public.es_super_admin()) with check (public.es_super_admin());

create policy "miembros activos leen la moneda"
  on public.config_moneda for select using (public.es_miembro_activo());

create policy "super admin edita la moneda"
  on public.config_moneda for all
  using (public.es_super_admin()) with check (public.es_super_admin());

-- --- auditoría (append-only, solo lectura para admins) ----------------------
create policy "admins leen auditoria"
  on public.auditoria for select using (public.es_admin());

create policy "autenticados escriben auditoria"
  on public.auditoria for insert
  to authenticated with check (actor_id = auth.uid());

-- =============================================================================
-- SEMILLA MÍNIMA
-- =============================================================================

insert into public.config_correo (clave, plantilla_asunto, plantilla_cuerpo) values
  ('aprobacion',
   'Tu solicitud fue aprobada',
   '<p>Hola {{nombre_usuario}},</p><p>Tu solicitud de admisión fue aprobada.</p><p><a href="{{enlace}}">Iniciar sesión</a></p>'),
  ('rechazo',
   'Sobre tu solicitud',
   '<p>Hola {{nombre_usuario}},</p><p>Tu solicitud no fue aprobada en esta ocasión.</p>');

insert into public.config_moneda (nombre, simbolo, valor_usd)
values ('Crédito', 'CR', 1.0);

insert into public.info_institucional (clave, titulo, contenido, orden) values
  ('mision_vision', 'Misión y Visión', 'Pendiente de redactar.', 1),
  ('valores',       'Valores',          'Pendiente de redactar.', 2),
  ('obligaciones',  'Obligaciones',     'Pendiente de redactar.', 3),
  ('privilegios',   'Privilegios',      'Pendiente de redactar.', 4),
  ('derechos',      'Derechos',         'Pendiente de redactar.', 5),
  ('limitaciones',  'Limitaciones',     'Pendiente de redactar.', 6),
  ('contratos',     'Contratos Económicos', 'Pendiente de redactar.', 7);
