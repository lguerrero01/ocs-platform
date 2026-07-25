import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { GeoConsentService } from '../../core/geo-consent.service';
import { MapaComponent } from '../../shared/mapa.component';

/**
 * Perfil del miembro. Incluye el control de revocación de ubicación: si la
 * plataforma guarda dónde está alguien, esa persona debe poder verlo y
 * retirarlo desde el mismo sitio.
 */
@Component({
  selector: 'app-perfil',
  imports: [DatePipe, DecimalPipe, MapaComponent],
  template: `
    <h1 class="text-xl font-semibold mb-5">Mi perfil</h1>

    @if (auth.perfil(); as p) {
      <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-4">
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-ocs-muted">Usuario</dt>
            <dd>{{ p.nombre_usuario }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ocs-muted">Correo</dt>
            <dd class="truncate ml-4">{{ p.correo }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ocs-muted">Rol</dt>
            <dd>{{ p.rol }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ocs-muted">Estatus</dt>
            <dd>{{ p.estatus }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ocs-muted">Progreso</dt>
            <dd class="text-ocs-accent">{{ p.progreso }}%</dd>
          </div>
        </dl>
      </div>

      <!-- Control de privacidad -->
      <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4">
        <h2 class="font-medium text-sm mb-2">Ubicación</h2>

        @if (p.geo_consentimiento_at) {
          <p class="text-sm text-ocs-muted mb-1">
            Compartiendo ubicación desde
            {{ p.geo_consentimiento_at | date: 'medium' }}.
          </p>
          @if (p.ubicacion_actualizada_at) {
            <p class="text-xs text-ocs-muted mb-2">
              Última captura: {{ p.ubicacion_actualizada_at | date: 'medium' }}
              ({{ p.ubicacion_lat | number: '1.4-4' }}, {{ p.ubicacion_lng | number: '1.4-4' }})
            </p>
            @if (p.ubicacion_lat !== null && p.ubicacion_lng !== null) {
              <div class="mb-3">
                <app-mapa
                  [lat]="p.ubicacion_lat"
                  [lng]="p.ubicacion_lng"
                  etiqueta="Tu última posición registrada"
                  [altura]="200"
                />
                <p class="text-xs text-ocs-muted mt-1">
                  Esto es exactamente lo que ven los administradores.
                </p>
              </div>
            }
          }
          <button
            (click)="revocar()"
            [disabled]="procesando()"
            class="text-sm rounded-lg border border-ocs-peligro/50 text-ocs-peligro px-3 py-1.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-peligro/10"
          >
            {{ procesando() ? 'Revocando…' : 'Revocar y borrar mi ubicación' }}
          </button>
          <p class="text-xs text-ocs-muted mt-2">
            Al revocar se borra tu última posición. Perderás acceso a las áreas de miembro
            mientras el permiso siga siendo requerido.
          </p>
        } @else {
          <p class="text-sm text-ocs-muted">No estás compartiendo tu ubicación.</p>
        }
      </div>
    }
  `,
})
export class PerfilComponent {
  readonly auth = inject(AuthService);
  private readonly geo = inject(GeoConsentService);
  readonly procesando = signal(false);

  async revocar(): Promise<void> {
    this.procesando.set(true);
    await this.geo.revocar();
    this.procesando.set(false);
  }
}
