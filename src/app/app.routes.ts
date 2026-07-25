import { Routes } from '@angular/router';
import { adminGuard, authGuard, miembroActivoGuard, superAdminGuard } from './core/guards';

export const routes: Routes = [
  // --- público -------------------------------------------------------------
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () =>
      import('./features/auth/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: 'auth/pendiente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/estado.component').then((m) => m.PendienteComponent),
  },
  {
    path: 'auth/sin-acceso',
    loadComponent: () =>
      import('./features/auth/estado.component').then((m) => m.SinAccesoComponent),
  },
  {
    path: 'onboarding/permisos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/permisos.component').then((m) => m.PermisosComponent),
  },

  // --- área de miembro -----------------------------------------------------
  {
    path: '',
    canActivate: [miembroActivoGuard],
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'misiones',
        loadComponent: () =>
          import('./features/misiones/misiones.component').then((m) => m.MisionesComponent),
      },
      {
        path: 'rangos',
        loadComponent: () =>
          import('./features/rangos/rangos.component').then((m) => m.RangosComponent),
      },
      {
        path: 'tienda',
        loadComponent: () =>
          import('./features/tienda/tienda.component').then((m) => m.TiendaComponent),
      },
      {
        path: 'info',
        loadComponent: () => import('./features/info/info.component').then((m) => m.InfoComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then((m) => m.PerfilComponent),
      },

      // --- administración --------------------------------------------------
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/solicitudes.component').then(
                (m) => m.AdminSolicitudesComponent,
              ),
          },
          {
            path: 'reclutamiento',
            loadComponent: () =>
              import('./features/admin/reclutamiento.component').then(
                (m) => m.AdminReclutamientoComponent,
              ),
          },
          {
            path: 'contenido',
            loadComponent: () =>
              import('./features/admin/contenido.component').then(
                (m) => m.AdminContenidoComponent,
              ),
          },
          {
            path: 'misiones',
            loadComponent: () =>
              import('./features/admin/misiones-admin.component').then(
                (m) => m.AdminMisionesComponent,
              ),
          },
          {
            path: 'tienda',
            loadComponent: () =>
              import('./features/admin/tienda-admin.component').then(
                (m) => m.AdminTiendaComponent,
              ),
          },
          {
            path: 'miembros',
            loadComponent: () =>
              import('./features/admin/miembros.component').then((m) => m.AdminMiembrosComponent),
          },
          {
            path: 'ajustes',
            canActivate: [superAdminGuard],
            loadComponent: () =>
              import('./features/admin/ajustes.component').then((m) => m.AdminAjustesComponent),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
