import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeoConsentService } from '../../core/geo-consent.service';
import { AuthService } from '../../core/auth.service';
import { IconoComponent } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';

/**
 * Consentimiento informado de ubicación.
 *
 * El principio: si la organización va a saber dónde está un miembro, el miembro
 * tiene que saberlo también, con el mismo detalle. Por eso esta pantalla dice
 * literalmente qué se guarda, quién lo ve y cómo se revoca — antes de pedir el
 * permiso al navegador, no después.
 */
@Component({
  selector: 'app-permisos',
  imports: [IconoComponent, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <app-logo [tamano]="56" />
        <div
          class="mt-5 mb-4 w-11 h-11 rounded-full bg-ocs-elevated border border-ocs-border flex items-center justify-center text-ocs-accent"
        >
          <app-icono nombre="ubicacion" [tamano]="22" />
        </div>
        <h1 class="text-xl font-semibold mb-2">Permiso de ubicación</h1>
        <p class="text-sm text-ocs-muted mb-6">
          Esta organización requiere que sus miembros compartan su ubicación para operar. Antes
          de aceptar, lee exactamente qué implica.
        </p>

        <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6 space-y-3 text-sm">
          <div class="flex gap-3">
            <span class="text-ocs-accent shrink-0">Qué</span>
            <span class="text-ocs-muted">
              Se guarda tu latitud y longitud aproximadas, con la fecha de cada captura.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-ocs-accent shrink-0">Cuándo</span>
            <span class="text-ocs-muted">
              {{ frecuencia() }} La app no accede a tu ubicación en segundo plano.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-ocs-accent shrink-0">Quién</span>
            <span class="text-ocs-muted">
              Los administradores de la organización. Cada consulta queda registrada en la
              auditoría.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-ocs-accent shrink-0">Revocar</span>
            <span class="text-ocs-muted">
              Puedes retirarlo cuando quieras desde tu perfil. Al hacerlo, tu última posición se
              borra de la base de datos.
            </span>
          </div>
        </div>

        @if (geo.ultimoError()) {
          <div class="rounded-lg border border-ocs-peligro/40 bg-ocs-peligro/10 p-3 mb-4 text-sm text-ocs-peligro">
            {{ geo.ultimoError() }}
            <p class="text-xs mt-2 text-ocs-peligro/80">
              Si lo bloqueaste antes, tendrás que habilitarlo desde la configuración del sitio en
              tu navegador.
            </p>
          </div>
        }

        <button
          (click)="aceptar()"
          [disabled]="procesando()"
          class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-3 disabled:opacity-50 mb-3 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
        >
          {{ procesando() ? 'Obteniendo ubicación…' : 'Acepto y compartir ubicación' }}
        </button>

        <button (click)="rechazar()" class="w-full text-sm text-ocs-muted underline py-2">
          No acepto
        </button>

        @if (mostrarRechazo()) {
          <p class="text-xs text-ocs-muted mt-4 text-center leading-relaxed">
            Sin este permiso no puedes acceder a las áreas de miembro. Tu cuenta permanece
            registrada; puedes volver y aceptar cuando quieras.
          </p>
        }
      </div>
    </div>
  `,
})
export class PermisosComponent {
  readonly geo = inject(GeoConsentService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly procesando = signal(false);
  readonly mostrarRechazo = signal(false);

  frecuencia(): string {
    return 'Solo al iniciar sesión y cuando abras la app.';
  }

  async aceptar(): Promise<void> {
    this.procesando.set(true);
    const ok = await this.geo.aceptarYCapturar();
    this.procesando.set(false);

    if (ok) {
      const destino = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      void this.router.navigateByUrl(destino);
    }
  }

  async rechazar(): Promise<void> {
    this.mostrarRechazo.set(true);
    await this.auth.cerrarSesion();
    setTimeout(() => void this.router.navigate(['/auth/login']), 2500);
  }
}
