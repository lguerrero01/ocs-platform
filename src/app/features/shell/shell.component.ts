import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CarritoService } from '../../core/carrito.service';

/**
 * Layout principal. Mobile-first: barra inferior en móvil, lateral en escritorio.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen md:flex">
      <!-- Barra lateral (escritorio) -->
      <aside
        class="hidden md:flex md:flex-col md:w-60 border-r border-ocs-border bg-ocs-surface p-4 shrink-0"
      >
        <div class="text-ocs-accent font-semibold text-lg mb-6 px-2">OCS</div>

        <nav class="flex flex-col gap-1 flex-1">
          @for (item of navegacion; track item.ruta) {
            <a
              [routerLink]="item.ruta"
              routerLinkActive="bg-ocs-bg text-ocs-accent"
              [routerLinkActiveOptions]="{ exact: item.ruta === '/' }"
              class="px-3 py-2 rounded-lg text-sm text-ocs-muted hover:text-ocs-text flex items-center gap-2"
            >
              <span>{{ item.icono }}</span>
              <span>{{ item.etiqueta }}</span>
            </a>
          }

          @if (auth.esAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="bg-ocs-bg text-ocs-accent"
              class="px-3 py-2 rounded-lg text-sm text-ocs-muted hover:text-ocs-text flex items-center gap-2 mt-4 border-t border-ocs-border pt-4"
            >
              <span>🛡️</span><span>Administración</span>
            </a>
          }
        </nav>

        <div class="border-t border-ocs-border pt-3 mt-3">
          <a routerLink="/perfil" class="block text-sm px-3 py-1.5 hover:text-ocs-accent">
            {{ auth.perfil()?.nombre_usuario }}
          </a>
          <button
            (click)="salir()"
            class="text-xs text-ocs-muted px-3 py-1.5 hover:text-ocs-text"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Cabecera móvil -->
      <div class="flex-1 flex flex-col min-w-0">
        <header
          class="md:hidden flex items-center justify-between border-b border-ocs-border bg-ocs-surface px-4 py-3 sticky top-0 z-10"
        >
          <span class="text-ocs-accent font-semibold">OCS</span>
          <a routerLink="/perfil" class="text-sm text-ocs-muted">
            {{ auth.perfil()?.nombre_usuario }}
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
              class="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-ocs-muted text-[10px]"
            >
              <span class="text-lg leading-none">{{ item.icono }}</span>
              <span>{{ item.etiqueta }}</span>
            </a>
          }
          @if (auth.esAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="text-ocs-accent"
              class="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-ocs-muted text-[10px]"
            >
              <span class="text-lg leading-none">🛡️</span>
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

  readonly navegacion = [
    { ruta: '/', etiqueta: 'Inicio', icono: '📰' },
    { ruta: '/misiones', etiqueta: 'Misiones', icono: '🎯' },
    { ruta: '/rangos', etiqueta: 'Rangos', icono: '🏅' },
    { ruta: '/tienda', etiqueta: 'Comercio', icono: '🛒' },
    { ruta: '/info', etiqueta: 'Info', icono: '📖' },
  ];

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    void this.router.navigate(['/auth/login']);
  }
}
