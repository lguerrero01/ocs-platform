import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-sm">
        <div class="flex flex-col items-center text-center mb-8">
          <app-logo [tamano]="120" />
          <h1 class="text-2xl font-semibold text-ocs-accent mt-5">Iniciar sesión</h1>
          <p class="text-sm text-ocs-muted mt-1">Acceso restringido a miembros.</p>
        </div>

        <form (ngSubmit)="entrar()" class="space-y-4">
          <div>
            <label class="block text-sm mb-1.5" for="correo">Correo</label>
            <input
              id="correo"
              type="email"
              name="correo"
              [(ngModel)]="correo"
              required
              autocomplete="email"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2.5 outline-none focus:border-ocs-accent transition-colors duration-200"
            />
          </div>

          <div>
            <label class="block text-sm mb-1.5" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2.5 outline-none focus:border-ocs-accent transition-colors duration-200"
            />
          </div>

          @if (error()) {
            <p class="text-sm text-ocs-peligro" role="alert">{{ error() }}</p>
          }

          <button
            type="submit"
            [disabled]="cargando()"
            class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-ocs-accent-soft transition-colors duration-200"
          >
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="text-xs text-ocs-muted mt-6 text-center">
          ¿Tienes un código de invitación?
          <a routerLink="/auth/registro" class="text-ocs-accent underline cursor-pointer">
            Regístrate aquí
          </a>
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
