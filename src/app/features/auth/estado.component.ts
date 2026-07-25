import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconoComponent } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';

/** Pantalla para postulantes en espera de decisión. */
@Component({
  selector: 'app-pendiente',
  imports: [IconoComponent, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-6 text-center">
      <div class="max-w-sm flex flex-col items-center">
        <app-logo [tamano]="72" />
        <div
          class="mt-6 mb-4 w-12 h-12 rounded-full bg-ocs-elevated border border-ocs-border flex items-center justify-center text-ocs-accent"
        >
          <app-icono nombre="reloj" [tamano]="24" />
        </div>
        <h1 class="text-xl font-semibold mb-2">Solicitud en revisión</h1>
        <p class="text-sm text-ocs-muted mb-6 leading-relaxed">
          Es todo. Si necesitamos saber algo más te contactaremos personalmente. Tu solicitud será
          revisada dentro de un lapso de 24 horas y recibirás un correo con el paso a seguir. Si se
          encuentran inconsistencias la solicitud será denegada y podrás volver a postular.
        </p>
        <button (click)="salir()" class="text-sm text-ocs-accent underline cursor-pointer">
          Cerrar sesión
        </button>
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
  imports: [IconoComponent, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-6 text-center">
      <div class="max-w-sm flex flex-col items-center">
        <app-logo [tamano]="72" />
        <div
          class="mt-6 mb-4 w-12 h-12 rounded-full bg-ocs-elevated border border-ocs-border flex items-center justify-center text-ocs-muted"
        >
          <app-icono nombre="candado" [tamano]="24" />
        </div>
        <h1 class="text-xl font-semibold mb-2">Acceso no disponible</h1>
        <p class="text-sm text-ocs-muted mb-6">
          Tu cuenta no tiene acceso a la plataforma en este momento. Contacta a un administrador si
          crees que es un error.
        </p>
        <button (click)="salir()" class="text-sm text-ocs-accent underline cursor-pointer">
          Cerrar sesión
        </button>
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
