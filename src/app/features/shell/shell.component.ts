import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CarritoService } from '../../core/carrito.service';
import { IconoComponent, NombreIcono } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';

/**
 * Layout principal. Mobile-first: barra inferior en móvil, lateral en escritorio.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconoComponent, LogoComponent],
  template: `
    <div class="min-h-screen md:flex">
      <!-- Barra lateral (escritorio) -->
      <aside
        class="hidden md:flex md:flex-col md:w-60 border-r border-ocs-border bg-ocs-surface p-4 shrink-0"
      >
        <a routerLink="/" class="flex items-center gap-2.5 mb-6 px-2 py-1 rounded-lg">
          <app-logo [tamano]="32" [decorativo]="true" />
          <span class="text-ocs-accent font-semibold text-lg tracking-wide">OCS</span>
        </a>

        <nav class="flex flex-col gap-1 flex-1">
          @for (item of navegacion; track item.ruta) {
            <a
              [routerLink]="item.ruta"
              routerLinkActive="bg-ocs-bg text-ocs-accent"
              [routerLinkActiveOptions]="{ exact: item.ruta === '/' }"
              class="px-3 py-2.5 rounded-lg text-sm text-ocs-muted hover:text-ocs-text hover:bg-ocs-elevated flex items-center gap-2.5 transition-colors duration-200 cursor-pointer"
            >
              <app-icono [nombre]="item.icono" />
              <span>{{ item.etiqueta }}</span>
            </a>
          }

          @if (auth.esAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="bg-ocs-bg text-ocs-accent"
              class="px-3 py-2.5 rounded-lg text-sm text-ocs-muted hover:text-ocs-text hover:bg-ocs-elevated flex items-center gap-2.5 mt-4 border-t border-ocs-border pt-4 transition-colors duration-200 cursor-pointer"
            >
              <app-icono nombre="admin" />
              <span>Administración</span>
            </a>
          }
        </nav>

        <div class="border-t border-ocs-border pt-3 mt-3">
          <a
            routerLink="/perfil"
            class="flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg text-ocs-text hover:text-ocs-accent hover:bg-ocs-elevated transition-colors duration-200 cursor-pointer"
          >
            <app-icono nombre="perfil" [tamano]="18" />
            <span class="truncate">{{ auth.perfil()?.nombre_usuario }}</span>
          </a>
          <button
            (click)="salir()"
            class="flex items-center gap-2.5 w-full text-xs text-ocs-muted px-3 py-2 rounded-lg hover:text-ocs-text hover:bg-ocs-elevated transition-colors duration-200 cursor-pointer"
          >
            <app-icono nombre="salir" [tamano]="18" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <!-- Cabecera móvil -->
      <div class="flex-1 flex flex-col min-w-0">
        <header
          class="md:hidden flex items-center justify-between border-b border-ocs-border bg-ocs-surface px-4 py-2.5 sticky top-0 z-10"
        >
          <a routerLink="/" class="flex items-center gap-2">
            <app-logo [tamano]="28" [decorativo]="true" />
            <span class="text-ocs-accent font-semibold tracking-wide">OCS</span>
          </a>
          <a
            routerLink="/perfil"
            class="flex items-center gap-1.5 text-sm text-ocs-muted px-2 py-2 rounded-lg"
          >
            <app-icono nombre="perfil" [tamano]="18" />
            <span class="truncate max-w-32">{{ auth.perfil()?.nombre_usuario }}</span>
          </a>
        </header>

        <main class="flex-1 px-4 py-5 pb-24 md:pb-8 md:px-8 max-w-4xl w-full">
          <router-outlet />
        </main>

        <!-- Barra inferior (móvil) -->
        <nav
          class="md:hidden fixed bottom-0 inset-x-0 border-t border-ocs-border bg-ocs-surface flex safe-bottom z-10"
        >
          @for (item of navegacion; track item.ruta) {
            <a
              [routerLink]="item.ruta"
              routerLinkActive="text-ocs-accent"
              [routerLinkActiveOptions]="{ exact: item.ruta === '/' }"
              class="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-ocs-muted text-[10px] transition-colors duration-200"
            >
              <app-icono [nombre]="item.icono" [tamano]="22" />
              <span>{{ item.etiqueta }}</span>
            </a>
          }
          @if (auth.esAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="text-ocs-accent"
              class="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-ocs-muted text-[10px] transition-colors duration-200"
            >
              <app-icono nombre="admin" [tamano]="22" />
              <span>Admin</span>
            </a>
          }
        </nav>
      </div>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);

  readonly navegacion: { ruta: string; etiqueta: string; icono: NombreIcono }[] = [
    { ruta: '/', etiqueta: 'Inicio', icono: 'inicio' },
    { ruta: '/misiones', etiqueta: 'Misiones', icono: 'misiones' },
    { ruta: '/rangos', etiqueta: 'Rangos', icono: 'rangos' },
    { ruta: '/tienda', etiqueta: 'Comercio', icono: 'comercio' },
    { ruta: '/info', etiqueta: 'Info', icono: 'info' },
  ];

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    void this.router.navigate(['/auth/login']);
  }
}
