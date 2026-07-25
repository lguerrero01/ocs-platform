import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Pantalla para postulantes en espera de decisión. */
@Component({
  selector: 'app-pendiente',
  template: `
    <div class="min-h-screen flex items-center justify-center px-6 text-center">
      <div class="max-w-sm">
        <div class="text-4xl mb-4">⏳</div>
        <h1 class="text-xl font-semibold mb-2">Solicitud en revisión</h1>
        <p class="text-sm text-ocs-muted mb-6">
          Un administrador está revisando tus respuestas. Recibirás un correo cuando haya una
          decisión.
        </p>
        <button (click)="salir()" class="text-sm text-ocs-accent underline">Cerrar sesión</button>
      </div>
    </div>
  `,
})
export class PendienteComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    void this.router.navigate(['/auth/login']);
  }
}

/** Pantalla para perfiles suspendidos o rechazados. */
@Component({
  selector: 'app-sin-acceso',
  template: `
    <div class="min-h-screen flex items-center justify-center px-6 text-center">
      <div class="max-w-sm">
        <div class="text-4xl mb-4">🔒</div>
        <h1 class="text-xl font-semibold mb-2">Acceso no disponible</h1>
        <p class="text-sm text-ocs-muted mb-6">
          Tu cuenta no tiene acceso a la plataforma en este momento. Contacta a un administrador
          si crees que es un error.
        </p>
        <button (click)="salir()" class="text-sm text-ocs-accent underline">Cerrar sesión</button>
      </div>
    </div>
  `,
})
export class SinAccesoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    void this.router.navigate(['/auth/login']);
  }
}
