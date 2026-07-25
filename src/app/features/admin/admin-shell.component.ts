import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="mb-5">
      <h1 class="text-xl font-semibold">Administración</h1>
      <p class="text-sm text-ocs-muted">
        Conectado como {{ auth.perfil()?.rol === 'super_admin' ? 'Super Admin' : 'Admin' }}.
      </p>
    </div>

    <nav class="flex gap-1 overflow-x-auto border-b border-ocs-border mb-5 -mx-4 px-4 md:mx-0 md:px-0">
      @for (t of pestanas(); track t.ruta) {
        <a
          [routerLink]="t.ruta"
          routerLinkActive="border-ocs-accent text-ocs-accent"
          [routerLinkActiveOptions]="{ exact: true }"
          class="px-3 py-2 text-sm border-b-2 border-transparent text-ocs-muted whitespace-nowrap -mb-px"
        >
          {{ t.etiqueta }}
        </a>
      }
    </nav>

    <router-outlet />
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);

  pestanas() {
    const base = [
      { ruta: '/admin', etiqueta: 'Solicitudes' },
      { ruta: '/admin/reclutamiento', etiqueta: 'Reclutamiento' },
      { ruta: '/admin/contenido', etiqueta: 'Contenido' },
      { ruta: '/admin/misiones', etiqueta: 'Misiones' },
      { ruta: '/admin/tienda', etiqueta: 'Tienda' },
      { ruta: '/admin/miembros', etiqueta: 'Miembros' },
    ];
    if (this.auth.esSuperAdmin()) {
      base.push({ ruta: '/admin/ajustes', etiqueta: 'Ajustes' });
    }
    return base;
  }
}
