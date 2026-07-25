# OCS Platform

Plataforma web de gestión para organizaciones cerradas y jerárquicas: ingreso por
invitación con QR de un solo uso, aprobación manual de postulantes, rangos, misiones,
publicaciones internas y comercio con moneda propia.

**Stack:** Angular 20 (standalone + signals) · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + Edge Functions)

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** y ejecuta el contenido de
   `supabase/migrations/20260724000100_esquema_inicial.sql`.
3. Copia la **Project URL** y la **anon key** desde *Project Settings → API*.

### 2. Configurar el frontend

Edita `src/environments/environment.ts`:

```ts
supabaseUrl: 'https://tu-proyecto.supabase.co',
supabaseAnonKey: 'eyJ...',
appUrl: 'http://localhost:4200',   // dominio real en producción
```

> La `anon key` es pública por diseño — toda la autorización vive en las políticas RLS.
> La `service_role key` **nunca** va en el frontend, solo en las Edge Functions.

### 3. Arrancar

```bash
npm install
npm start           # http://localhost:4200
```

### 4. Crear el primer super admin

No hay forma de auto-asignarse el rol desde la app (lo impide el trigger
`proteger_super_admin`). El primer super admin se crea a mano:

1. Regístrate normalmente por la app, o crea el usuario desde *Authentication → Users*.
2. En el SQL Editor:

```sql
update public.perfiles
   set rol = 'super_admin', estatus = 'activo'
 where correo = 'tu-correo@ejemplo.com';
```

### 5. Desplegar la Edge Function de correos

```bash
supabase functions deploy decidir-solicitud
supabase secrets set RESEND_API_KEY=re_xxx CORREO_REMITENTE=no-reply@tudominio.com APP_URL=https://tudominio.com
```

Sin `RESEND_API_KEY` la aprobación funciona igual, pero no se envía el correo
(la respuesta trae `correo_enviado: false`). Puedes cambiar Resend por cualquier
otro proveedor editando el `fetch` de la función.

---

## Cómo funciona el ingreso

```
Admin genera QR  →  postulante lo escanea  →  canjear_codigo_qr() lo inhabilita
      →  crea cuenta (estatus: postulante)  →  responde el formulario
      →  admin aprueba/rechaza  →  Edge Function registra quién decidió + envía correo
      →  estatus: activo  →  acceso a la plataforma
```

El código QR se inhabilita en la **misma transacción** en que se valida, así que no
sirve dos veces ni aunque se escanee simultáneamente.

---

## Seguridad

La frontera de seguridad es **PostgreSQL, no Angular**. Los guards del router solo
evitan pantallas rotas; quien llame a la API directamente choca igual contra RLS.

| Mecanismo | Qué protege |
|---|---|
| Políticas RLS por tabla | Todo el acceso a datos |
| `proteger_campos_privilegiados` | Nadie se auto-asciende de rol, rango, estatus ni progreso |
| `proteger_super_admin` | Solo un super admin crea o degrada super admins |
| `canjear_codigo_qr` | Canje atómico del QR (`SECURITY DEFINER` + `FOR UPDATE`) |
| Tabla `auditoria` | Append-only: se puede insertar y leer, nunca editar ni borrar |

---

## Sobre los permisos de ubicación y micrófono

La especificación original pedía exigir **ubicación GPS y micrófono** al instalar la
app, bloqueando la interfaz de quien los rechazara.

**El micrófono no está implementado, deliberadamente.** Ninguna funcionalidad de la
plataforma usa audio, así que pedir ese permiso no habilitaría ninguna función: solo
serviría para capturar sonido sin que el miembro lo sepa. Además es inviable en la
práctica — el navegador exige un gesto explícito del usuario, muestra su propio
diálogo, mantiene un indicador visible mientras el micrófono está activo, y Chrome y
Safari penalizan a los sitios que lo piden sin uso aparente. Si en el futuro se añade
una función real que necesite audio (notas de voz, por ejemplo), el permiso se pide
en ese momento y para eso.

**La ubicación sí está implementada**, porque puede tener un uso operativo legítimo,
pero con consentimiento informado:

- `features/onboarding/permisos` explica qué se guarda, quién lo ve y cómo revocarlo
  **antes** de pedir el permiso al navegador.
- El miembro puede revocarlo desde su perfil; al hacerlo se borra su última posición
  (lo fuerza el trigger `exigir_consentimiento_geo`, no el frontend).
- Cada captura y cada revocación quedan en `auditoria`.
- Si `environment.geo.required` es `true`, quien no acepte no accede a las áreas de
  miembro — pero sabiendo exactamente qué está aceptando.

Para desactivar el requisito, pon `geo.required: false` en el environment.

Ten en cuenta que recolectar ubicación de personas conlleva obligaciones legales
(GDPR, LOPD y equivalentes locales): base legal, finalidad declarada, plazo de
conservación y derecho de acceso y borrado. El consentimiento revocable y la
auditoría cubren la parte técnica; la parte documental corre por tu cuenta.

---

## Identidad visual

La paleta no es decorativa: sale del emblema. El logo existe en dorado
(`#956d2f`) y en blanco sobre oliva (`#4d574e`), y esos dos colores son los dos
ejes del tema en `src/styles.css`:

| Token | Valor | De dónde sale |
|---|---|---|
| `--color-ocs-bg` / `surface` / `elevated` / `border` | `#0e110e` … `#303631` | Oliva del logo (matiz 126°) a distinta luminosidad |
| `--color-ocs-border-strong` | `#4d574e` | Oliva de marca exacto; bordes de campos |
| `--color-ocs-accent` | `#cb9a4d` | Dorado de marca (36°) aclarado hasta contrastar 7.5:1 |
| `--color-ocs-accent-deep` | `#956d2f` | Dorado original; solo superficies grandes, nunca texto |

Todos los pares de texto superan 7:1 (WCAG AAA). El dorado original se queda en
4.1:1 sobre el fondo, así que sirve para una forma grande pero no para leer.

Los iconos son SVG de trazo que heredan `currentColor` (`shared/icono.component.ts`),
no emoji: un emoji lo dibuja cada sistema operativo a su manera y con colores
ajenos a la paleta. Los assets del logo se generan desde `brand/` — ver
`brand/README.md`.

---

## Estado de la implementación

**Implementado y compilando:**

- Esquema completo con RLS, triggers y funciones
- Registro por QR de un solo uso con formulario de admisión
- Aprobación/rechazo con trazabilidad y correo de plantilla editable
- Inicio con noticias, artículos, anuncios y llamados de atención
- Misiones individuales y grupales filtradas por rango, con barra de progreso
- Información institucional en menú colapsable, filtrada por rango
- Tienda con carrito, doble precio (USD / moneda interna) y pedidos
- Jerarquía de rangos con insignias, cupos y dependencias
- Panel admin: solicitudes, generador de QR, CRUD de contenido/misiones/tienda,
  gestión de miembros, penalizaciones y delegación de rol
- Panel super admin: plantillas de correo, tipo de cambio y auditoría

**Pendiente:**

- La stablecoin como activo real (contrato, custodia, liquidación). Hoy la moneda
  funciona como unidad de cuenta con tipo de cambio configurable — que es lo que hace
  falta para operar mientras tanto. Emitir un activo con valor monetario tiene
  implicaciones regulatorias que conviene resolver antes de escribir el contrato.
- Pasarela de pago real para los pedidos.
- Service worker para PWA offline (`ng add @angular/pwa`).
- Editor de texto enriquecido para las plantillas de correo — hoy es un textarea de
  HTML, funcional pero no WYSIWYG.
- Notificaciones push de nuevas solicitudes (hoy se ven en el panel).

---

## Despliegue en GitHub Pages

`.github/workflows/deploy-pages.yml` construye y publica en cada push a `main`.
Para activarlo: *Settings → Pages → Source: **GitHub Actions***.

Dos ajustes que el workflow ya resuelve:

- **`base-href`** se fija al nombre del repo, porque Pages sirve bajo
  `https://<usuario>.github.io/<repo>/`.
- **Fallback SPA**: se copia `index.html` a `404.html`. Sin esto, refrescar en
  `/misiones` daría un 404 — Pages no reescribe rutas hacia el index.

### Antes de publicar, ten en cuenta

**GitHub Pages es un host público.** No existe la opción de un sitio privado en
los planes gratuitos: si el repo es privado, Pages está deshabilitado; si activas
Pages, el sitio es accesible para cualquiera que tenga la URL, la indexen los
buscadores incluida.

Para una organización cerrada eso significa que **la pantalla de login y el
formulario de registro quedan expuestos a internet**. Los datos siguen protegidos
por RLS y nadie entra sin un QR válido y sin aprobación manual — pero la
existencia de la plataforma deja de ser discreta.

Si esa exposición no es aceptable, las alternativas son:

- **Cloudflare Pages / Netlify / Vercel** — despliegue igual de simple, con la
  opción de proteger el sitio por contraseña o por Cloudflare Access.
- **Hosting propio** detrás de una VPN o de una allowlist de IPs.
- **Solo desarrollo local** hasta que la organización decida exponerse.

La `anon key` de Supabase quedará incrustada en el bundle público. Eso es correcto
por diseño — está pensada para ser pública y RLS es lo que protege los datos. Lo
que **nunca** debe llegar al repo es la `service_role key`.

---

## Comandos

```bash
npm start                 # servidor de desarrollo
npm run build             # build de producción
npm test                  # tests unitarios
```
