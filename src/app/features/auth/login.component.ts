import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <h1 class="text-2xl font-semibold text-ocs-accent mb-1">Iniciar sesión</h1>
        <p class="text-sm text-ocs-muted mb-6">Acceso restringido a miembros.</p>

        <form (ngSubmit)="entrar()" class="space-y-4">
          <div>
            <label class="block text-sm mb-1" for="correo">Correo</label>
            <input
              id="correo"
              type="email"
              name="correo"
              [(ngModel)]="correo"
              required
              autocomplete="email"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border px-3 py-2 outline-none focus:border-ocs-accent"
            />
          </div>

          <div>
            <label class="block text-sm mb-1" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border px-3 py-2 outline-none focus:border-ocs-accent"
            />
          </div>

          @if (error()) {
            <p class="text-sm text-red-400">{{ error() }}</p>
          }

          <button
            type="submit"
            [disabled]="cargando()"
            class="w-full rounded-lg bg-ocs-accent text-black font-medium py-2.5 disabled:opacity-50"
          >
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="text-xs text-ocs-muted mt-6 text-center">
          ¿Tienes un código de invitación?
          <a routerLink="/auth/registro" class="text-ocs-accent underline">Regístrate aquí</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  correo = '';
  password = '';
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  async entrar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const { error } = await this.auth.iniciarSesion(this.correo, this.password);
    this.cargando.set(false);

    if (error) {
      this.error.set('Correo o contraseña incorrectos.');
      return;
    }

    const perfil = await this.auth.cargarPerfil();
    if (perfil?.estatus === 'postulante') {
      void this.router.navigate(['/auth/pendiente']);
    } else if (perfil?.estatus === 'activo') {
      void this.router.navigate(['/']);
    } else {
      void this.router.navigate(['/auth/sin-acceso']);
    }
  }
}
