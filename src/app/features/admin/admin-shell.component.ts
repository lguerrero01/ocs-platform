import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';

/**
 * Marco del área de administración.
 *
 * Las clases de la pestaña activa se aplican con `[class]` a partir de
 * `isActive`, no acumulando clases con `routerLinkActive`: al mezclar
 * `text-ocs-accent` con el `text-ocs-muted` de la clase base gana la que Tailwind
 * emita más abajo, no la que aparezca antes en el atributo, y la pestaña activa
 * se quedaba sin resaltar.
 */
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

    <nav
      class="flex gap-1 overflow-x-auto border-b border-ocs-border mb-5 -mx-4 px-4 md:mx-0 md:px-0"
      aria-label="Secciones de administración"
    >
      @for (t of pestanas(); track t.ruta) {
        <a
          [routerLink]="t.ruta"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: true }"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap flex items-center gap-2 rounded-t-lg cursor-pointer transition-colors duration-200"
          [class]="
            rla.isActive
              ? 'border-ocs-accent text-ocs-accent font-semibold bg-ocs-accent/10'
              : 'border-transparent text-ocs-muted hover:text-ocs-text hover:border-ocs-border-strong'
          "
        >
          <span>{{ t.etiqueta }}</span>

          <!-- Postulantes esperando decisión: el aviso vive en la pestaña
               porque el admin puede estar trabajando en otra sección. -->
          @if (t.ruta === '/admin' && datos.postulantesPendientes() > 0) {
            <span
              class="min-w-5 h-5 px-1.5 rounded-full bg-ocs-accent text-ocs-bg text-[11px] font-semibold flex items-center justify-center"
              [attr.aria-label]="
                datos.postulantesPendientes() + ' solicitudes esperando decisión'
              "
            >
              {{ datos.postulantesPendientes() }}
            </span>
          }
        </a>
      }
    </nav>

    <router-outlet />
  `,
})
export class AdminShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly datos = inject(DatosService);

  async ngOnInit(): Promise<void> {
    await this.datos.refrescarPostulantesPendientes();
  }

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
